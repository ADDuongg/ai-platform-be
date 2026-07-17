# CODE_WALKTHROUGH

> How this backend actually works — written for a senior engineer joining the team.
> Read top to bottom once (~25 minutes). Follow the call paths; do not treat this as an API catalog.

---

# 1. High Level Overview

## What this project does

**ai-platform-be** is an enterprise NestJS API for an AI workflow platform. Operators design **workflows** as DAGs of **agent** nodes. Each agent is a versioned capability backed by a **prompt** (and optionally **tools**). When someone runs a workflow, the platform creates an **execution**, freezes the graph + agent versions, enqueues work on BullMQ, and runs agents asynchronously (stub fixtures or a live LLM).

It is **not** a chatbot monolith. Catalog APIs (agents, prompts, tools, workflows) are separate from the runtime (executions). Auth is JWT + permission-based RBAC. There is no public self-registration.

## Main responsibilities

| Area | Responsibility |
|------|----------------|
| **Auth / Users** | Login, refresh, logout, RBAC, admin user provisioning |
| **Catalog** | Versioned Agents, Prompts, Tools, Workflows (draft → publish) |
| **Builder** | Mutate workflow graph (nodes/edges/definition) while draft |
| **Runtime** | Start execution → queue → orchestrate DAG → invoke agents/tools |
| **Infra** | Postgres (TypeORM), Redis (blacklist/lockout), BullMQ, Pino logging |

## Main modules

```
AppModule
├── Config + Throttler (global)
├── Logger / Database / Redis / Queue   ← infrastructure adapters
├── AuthModule ↔ UsersModule            ← forwardRef (circular)
├── AgentsModule → Prompts, Tools
├── WorkflowsModule → Agents
├── ExecutionsModule → Workflows, Agents, Prompts, Tools + Bull queue
└── HealthModule
```

Feature modules own domain logic. Controllers never touch TypeORM repositories. Infrastructure is injected via DI.

## Overall architecture

```
HTTP (Express + Nest)
        │
        ▼
  Guards (throttle → JWT → permissions)
        │
        ▼
  Controllers  ──sync──►  Services  ──►  Repositories  ──►  Postgres
        │                      │
        │                      └── (executions only) enqueue BullMQ job
        │                                    │
        │                                    ▼
        │                          ExecutionProcessor
        │                                    │
        │                                    ▼
        │                          Orchestrator → AgentRunner → LLM/Tools
        ▼
  ResponseInterceptor / GlobalExceptionFilter
```

**Mental model:** catalog is synchronous CRUD + publish. Execution is intentionally **async** — the HTTP response is usually `pending`; clients poll.

---

# 2. Request Lifecycle

```
HTTP Request
  → Express middleware (helmet, compression, cookie-parser, pino)
  → Guards (Throttler → JwtAuth → Permissions)
  → Interceptor (outbound envelope)
  → ValidationPipe
  → Controller
  → Service
  → Repository
  → Database
  → Response (or Exception Filter)
```

There is **no** Nest `MiddlewareConsumer` and **no** AsyncLocalStorage / CLS. Request IDs come from nestjs-pino.

---

## 2.1 Bootstrap & Express middleware

**File:** `src/main.ts`

```25:52:src/main.ts
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  app.enableCors({
    origin: cors?.origins ?? true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-correlation-id'],
  });

  app.setGlobalPrefix(appConfig?.apiPrefix ?? 'api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: appConfig?.apiVersion ?? '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
```

**Why this exists:** Harden headers (helmet), shrink payloads (compression), support refresh-token cookies, version every route as `/api/v1/...`, and reject unknown DTO fields before they reach services.

**If removed:** Open CORS / missing cookies break auth refresh; clients start sending garbage fields into services; routes lose a stable versioning contract.

**Careful:** Validation is global. Do not add a second `ValidationPipe` “to be safe” on controllers — you will double-transform and confuse Swagger.

Request IDs (pino):

```17:24:src/infrastructure/logger/logger.config.ts
      genReqId: (req: IncomingMessage, res: ServerResponse) => {
        const existing =
          (req.headers['x-request-id'] as string | undefined) ??
          (req.headers['x-correlation-id'] as string | undefined);
        const id = existing ?? randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
```

Prefer `x-request-id`; `x-correlation-id` is accepted as an alias on the way in.

---

## 2.2 Global providers (filter, interceptor, guards)

**File:** `src/app.module.ts`

```67:88:src/app.module.ts
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
```

**Why registered here:** Cross-cutting concerns stay out of every controller. Order of `APP_GUARD` registration is the order Nest runs them: throttle first, then auth, then permissions.

---

## 2.3 Guards

### JwtAuthGuard — default-deny authentication

```7:24:src/common/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
```

**Why:** Every route requires a Bearer JWT unless marked `@Public()`. That is safer than remembering to put `@UseGuards` on each controller.

**If removed:** Public-by-default is a security footgun in an admin platform.

**Careful:** `@Public()` also skips `PermissionsGuard`. Health and login are public; almost nothing else should be.

Passport validates the token and checks Redis blacklist:

```27:46:src/modules/auth/strategies/jwt.strategy.ts
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid token', ERROR_CODES.INVALID_TOKEN);
    }

    if (payload.jti) {
      const isBlacklisted = await this.redisService.get(`token:blacklist:${payload.jti}`);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked', ERROR_CODES.INVALID_TOKEN);
      }
    }

    return {
      sub: payload.sub,
      email: payload.email,
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
      jti: payload.jti,
    };
  }
```

**Why blacklist:** Logout can revoke access tokens before natural expiry. Permissions live **on the JWT** — changing a user’s roles mid-session does not update an already-issued access token until refresh/re-login.

### PermissionsGuard — any-of permissions

```26:49:src/common/guards/permissions.guard.ts
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = request.user;

    if (!user?.permissions?.length) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const permissions = user.permissions ?? [];
    const hasPermission = requiredPermissions.some((perm) => permissions.includes(perm));

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions', {
        required: requiredPermissions,
      });
    }
```

**Why ANY (`.some`), not ALL:** Route decorators list alternatives (or a single required perm). Keep route metadata small.

**Careful:** A handler with **no** `@Permissions()` is authenticated-but-unrestricted. That is intentional for some auth self endpoints; for catalog routes it is usually a bug — always decorate.

```6:10:src/common/decorators/permissions.decorator.ts
/**
 * Restricts access to users possessing ANY of the specified permissions.
 */
export const Permissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
```

---

## 2.4 Interceptor — success envelope

```14:37:src/common/interceptors/response.interceptor.ts
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, SuccessResponseDto<T>> {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<SuccessResponseDto<T>> {
    return next.handle().pipe(
      map((payload: unknown) => {
        if (this.isAlreadyEnveloped(payload)) {
          return payload as SuccessResponseDto<T>;
        }

        if (this.hasDataMetaShape(payload)) {
          return {
            success: true as const,
            data: payload.data as T,
            meta: payload.meta ?? {},
          };
        }

        return {
          success: true as const,
          data: payload as T,
          meta: {},
        };
      }),
    );
  }
```

**Why:** Controllers return domain DTOs (or `{ data, meta }` for lists). Clients always see `{ success, data, meta }`.

**Careful:** List endpoints that already return `{ data, meta }` must **not** also wrap with `success: true` themselves — the interceptor detects both shapes. Double-wrapping causes nested `data.data`.

---

## 2.5 Exception filter — error envelope

```22:58:src/common/filters/global-exception.filter.ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, code, message, details } = this.normalizeException(exception);
    // ... log error vs warn ...
    const body: ErrorResponseDto = {
      success: false,
      error: {
        code,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(body);
  }
```

**Why:** Domain code throws `AppException` with a stable `ERROR_CODES.*` string. Validation failures become `VALIDATION_ERROR` with `details` = class-validator messages. Unknown errors become a generic 500 — no stack traces to clients.

**If removed:** Controllers would leak Nest’s default shapes; FE error handling fragments.

**Careful:** Throw `AppException` (or typed helpers) in services. Raw `Error` from the orchestrator/LLM path becomes a failed **step**, not an HTTP response (that path is async).

---

## 2.6 Controller → Service → Repository → DB

Typical controller (thin):

```25:34:src/modules/executions/controllers/executions.controller.ts
  @Post()
  @Permissions(PERMISSIONS.EXECUTIONS.CREATE)
  @ApiOperation({ summary: 'Start Execution' })
  @ApiCreatedResponse({ type: ExecutionResponseDto })
  async create(
    @Body() dto: CreateExecutionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ExecutionResponseDto> {
    return this.executionsService.startFromBody(dto, user.sub);
  }
```

Repositories extend a shared Data Mapper base:

```9:41:src/common/repositories/base.repository.ts
export abstract class BaseRepository<T extends ObjectLiteral> implements IBaseRepository<T> {
  constructor(protected readonly repository: Repository<T>) {}

  async findById(id: string): Promise<T | null> {
    return this.repository.findOne({
      where: { id } as unknown as FindOptionsWhere<T>,
    });
  }
  // ...
  async createAndSave(data: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  async withTransaction<R>(work: (manager: EntityManager) => Promise<R>): Promise<R> {
    return this.repository.manager.transaction(work);
  }
```

**Why Data Mapper:** Entities stay dumb persistence. Soft-delete + transactions live in one place. Controllers never import TypeORM.

Entities share UUID + soft delete:

```12:24:src/common/entities/base.entity.ts
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deletedAt!: Date | null;
}
```

---

# 3. Module Walkthrough

Focus on business behavior, not CRUD.

---

## 3.1 Auth & Users

**Responsibility:** Session security and admin user lifecycle. No public signup.

**Flow:** `POST /auth/login` (`@Public`, stricter `@Throttle`) → `AuthService` verifies password, checks Redis lockout, issues access JWT + refresh cookie, writes audit log.

**Important:** Permissions are embedded in the JWT at login. Redis stores:
- login failure / lockout counters
- access-token `jti` blacklist on logout

`AuthModule` ↔ `UsersModule` use `forwardRef` because users need roles and auth needs the users repository.

---

## 3.2 Prompts & Tools (catalog leaves)

**Responsibility:** Versioned templates and tool definitions referenced by agents.

- Create always writes parent + version `1` in a **transaction**.
- Publish freezes a draft version; soft-delete archives the catalog entry.
- Modules export **Service only** (repos stay private) — Executions talks to catalog through the service API.

Agents validate `promptRef` / `toolRefs` against these services before saving.

---

## 3.3 Agents

**Responsibility:** Versioned AI capabilities (schemas, prompt/tool refs, timeout, retries).

Create path (business rules + atomicity):

```35:89:src/modules/agents/services/agents.service.ts
  async create(dto: CreateAgentDto, actorId: string): Promise<AgentResponseDto> {
    const code = dto.code.trim().toLowerCase();
    assertJsonPayloadSize(dto.inputSchema, 'inputSchema');
    assertJsonPayloadSize(dto.outputSchema, 'outputSchema');
    // ... uniqueness, validatePromptRef, validateToolRefs ...

    return this.agentsRepository.withTransaction(async (manager) => {
      const agentRepo = manager.getRepository(AgentEntity);
      const versionRepo = manager.getRepository(AgentVersionEntity);

      const savedAgent = await agentRepo.save(
        agentRepo.create({
          code,
          // ... DRAFT, enabled: true, currentVersion: null ...
        }),
      );

      await versionRepo.save(
        versionRepo.create({
          agentId: savedAgent.id,
          version: 1,
          status: AgentVersionStatus.DRAFT,
          // ... schemas, promptRef, toolRefs ...
        }),
      );

      return this.toAgentDto(savedAgent, 1);
    });
  }
```

**Why transaction:** Never leave an agent without version 1 (or a version without parent).

**Careful:** Execution later requires `PUBLISHED` + `enabled`. Draft agents are invisible to the runtime even if pinned incorrectly — validators catch this at start time when `checkAgents: true`.

List visibility: users without draft-seeing permissions only see published catalog entries (`canSeeCatalogDrafts`).

---

## 3.4 Workflows

**Responsibility:** Workflow catalog + graph builder.

| Surface | Controller | Service |
|---------|------------|---------|
| CRUD / publish / clone | `WorkflowsController` | `WorkflowsService` |
| Nodes / edges / replace definition | `WorkflowBuilderController` | `WorkflowBuilderService` |

**Publish** (draft version → published, workflow becomes executable):

```162:186:src/modules/workflows/services/workflows.service.ts
  async publish(id: string): Promise<WorkflowResponseDto> {
    const workflow = await this.requireMutableWorkflow(id);

    return this.workflowsRepository.withTransaction(async (manager) => {
      // ... load draft version ...
      this.assertPublishableDefinition(draft.definitionJson);

      draft.status = WorkflowVersionStatus.PUBLISHED;
      // ... bump workflow.currentVersion, status PUBLISHED ...
```

**Why separate builder:** Graph edits are high-churn and need definition validation (cycles, agent refs). Publishing is a deliberate, immutable freeze of a version — executions pin that version forever.

`WorkflowDefinitionValidator` is exported so Executions can re-validate at start with `checkAgents: true`.

---

## 3.5 Executions (the runtime)

**Responsibility:** Start runs, persist snapshots, drive the DAG asynchronously, expose poll/cancel/retry APIs.

Two HTTP entry points converge on one private method:

| Endpoint | Permission | Service method |
|----------|------------|----------------|
| `POST /v1/executions` | `executions:create` | `startFromBody` |
| `POST /v1/workflows/:id/execute` | `workflows:execute` | `startFromWorkflow` |

```52:62:src/modules/executions/services/executions.service.ts
  async startFromWorkflow(
    workflowId: string,
    dto: ExecuteWorkflowDto,
    startedBy: string,
  ): Promise<ExecutionResponseDto> {
    return this.start(workflowId, dto.version ?? null, dto.input ?? {}, startedBy);
  }

  async startFromBody(dto: CreateExecutionDto, startedBy: string): Promise<ExecutionResponseDto> {
    return this.start(dto.workflowId, dto.version ?? null, dto.input ?? {}, startedBy);
  }
```

**Why two doors:** Product UX (execute from workflow detail) vs ops/API clients that already know `workflowId`. Same invariants.

Core entities:

```8:31:src/modules/executions/entities/execution.entity.ts
@Entity({ name: 'executions' })
export class ExecutionEntity extends BaseEntity {
  // workflowId, workflowCode, workflowVersion, status
  @Column({ type: 'jsonb', name: 'input_json', default: () => "'{}'" })
  inputJson!: Record<string, unknown>;

  @Column({ type: 'jsonb', name: 'context_json', default: () => "'{}'" })
  contextJson!: Record<string, unknown>;

  @Column({ type: 'jsonb', name: 'definition_snapshot' })
  definitionSnapshot!: DefinitionSnapshot;
```

`definitionSnapshot` = frozen `{ definition, agentPins }`. Later edits to the catalog **must not** change an in-flight or historical run.

---

## 3.6 Health

Public Terminus probes (Postgres, Redis, heap). Useful for k8s / load balancers — no auth.

---

# 4. Execution Flow

Feature: **Run a published workflow** (`POST /api/v1/workflows/:id/execute`).

```
Controller
  → ExecutionsService.start
      → validate input size
      → load PUBLISHED workflow + version
      → validate definition (agents exist)
      → assert required inputs
      → pin agent versions
      → persist Execution + Steps
      → BullMQ enqueue
  → HTTP 201 (usually status=pending)
        ⋮ async
  ExecutionProcessor
  → ExecutionOrchestratorService.run
      → WorkflowEngine ready nodes
      → AgentRunner.invoke (stub | LLM + tools)
      → map output into context
      → COMPLETED | FAILED | CANCELLED
```

---

## 4.1 Controller

```17:27:src/modules/executions/controllers/workflow-execute.controller.ts
  @Post(':id/execute')
  @Permissions(PERMISSIONS.WORKFLOWS.EXECUTE)
  @ApiOperation({ summary: 'Execute published Workflow' })
  @ApiCreatedResponse({ type: ExecutionResponseDto })
  async execute(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExecuteWorkflowDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ExecutionResponseDto> {
    return this.executionsService.startFromWorkflow(id, dto, user.sub);
  }
```

DTO is intentionally small:

```5:23:src/modules/executions/dto/execute-workflow.dto.ts
export class ExecuteWorkflowDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number | null;

  @IsOptional()
  @IsObject()
  input?: Record<string, unknown>;
}

export class CreateExecutionDto extends ExecuteWorkflowDto {
  @IsUUID()
  workflowId!: string;
}
```

---

## 4.2 Validation & pins (sync)

```156:212:src/modules/executions/services/executions.service.ts
  private async start(
    workflowId: string,
    version: number | null,
    input: Record<string, unknown>,
    startedBy: string,
  ): Promise<ExecutionResponseDto> {
    this.assertInputSize(input);

    const workflow = await this.workflowsRepository.findById(workflowId);
    if (!workflow || workflow.status !== WorkflowStatus.PUBLISHED) {
      throw new AppException('Workflow not found or not published', HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.WORKFLOW_NOT_FOUND,
      });
    }
    // ... resolve published WorkflowVersion ...
    const validation = await this.definitionValidator.validate(workflowVersion.definitionJson, {
      checkAgents: true,
    });
    // ...
    assertRequiredInputs(definition, input);
    const agentPins = await this.buildAgentPins(definition);
    const snapshot: DefinitionSnapshot = { definition, agentPins };

    const context: Record<string, unknown> = {
      ...definition.variables,
      ...input,
      input,
    };
```

**Why pin agents at start:** Reproducibility. The node may say “latest”; the pin records the exact version number used.

**Why `input` duplicated under `context.input`:** Mappings often read `input.foo` while also allowing flat variable keys.

Required inputs:

```33:67:src/modules/executions/services/required-inputs.ts
export function assertRequiredInputs(
  definition: WorkflowDefinition,
  input: Record<string, unknown>,
): void {
  const required = extractRequiredInputs(definition);
  // ... collect missing / blank ...
  throw new AppException('Execution input is missing required fields', HttpStatus.BAD_REQUEST, {
    code: ERROR_CODES.VALIDATION_ERROR,
    details: { field: 'input', required, missing, blank },
  });
}
```

---

## 4.3 Persistence & enqueue

```214:257:src/modules/executions/services/executions.service.ts
    const hasNoNodes = definition.nodes.length === 0;

    const execution = await this.executionsRepository.createAndSave({
      workflowId: workflow.id,
      workflowCode: workflow.code,
      workflowVersion: targetVersion,
      status: hasNoNodes ? ExecutionStatus.COMPLETED : ExecutionStatus.PENDING,
      inputJson: input,
      contextJson: context,
      definitionSnapshot: snapshot,
      // ...
    });

    if (!hasNoNodes) {
      for (const pin of agentPins) {
        // ... create ExecutionStep PENDING per node ...
      }

      await this.enqueueRun(execution.id);
    }

    return this.toExecutionDto(execution);
```

```327:344:src/modules/executions/services/executions.service.ts
  private async enqueueRun(executionId: string): Promise<void> {
    try {
      await this.executionQueue.add(
        EXECUTION_JOB_RUN,
        { executionId },
        {
          jobId: `execution-${executionId}-${Date.now()}`,
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      );
    } catch (error) {
      // ... AppException INTERNAL_SERVER_ERROR ...
    }
  }
```

**Why empty graph → COMPLETED immediately:** Builder demos and seed “empty” workflows should not hang a worker.

**Trade-off:** Start does **not** wrap execution + steps + enqueue in one DB transaction. If enqueue fails after persist, you get a stuck `PENDING` row (logged + 500 to client). Worth knowing when debugging.

---

## 4.4 Worker → orchestrator

```12:28:src/modules/executions/processors/execution.processor.ts
@Processor(EXECUTION_QUEUE)
export class ExecutionProcessor extends WorkerHost {
  async process(job: Job<RunExecutionJob>): Promise<void> {
    if (job.name !== EXECUTION_JOB_RUN) {
      this.logger.warn(`Ignoring unknown job name ${job.name}`);
      return;
    }
    const { executionId } = job.data;
    this.logger.log(`Processing execution ${executionId}`);
    await this.orchestrator.run(executionId);
  }
}
```

Ready-node resolution (DAG):

```21:39:src/modules/executions/services/workflow-engine.service.ts
  resolveReadyNodeIds(definition: WorkflowDefinition, steps: StepState[]): string[] {
    const statusByNode = new Map(steps.map((step) => [step.nodeId, step.status]));
    const ready: string[] = [];

    for (const node of definition.nodes) {
      const status = statusByNode.get(node.id);
      if (status !== ExecutionStepStatus.PENDING && status !== ExecutionStepStatus.RETRYING) {
        continue;
      }
      const predecessors = this.getPredecessors(node.id, definition.edges);
      const allDone = predecessors.every(
        (pred) => statusByNode.get(pred) === ExecutionStepStatus.COMPLETED,
      );
      if (allDone) {
        ready.push(node.id);
      }
    }

    return ready;
  }
```

Orchestrator invokes the agent and maps context:

```164:189:src/modules/executions/services/execution-orchestrator.service.ts
      const context = { ...currentExecution.contextJson };
      const mappedInput = applyInputMapping(context, node.inputMapping);
      step.inputJson = mappedInput;
      await this.executionStepsRepository.save(step);

      try {
        await this.assertAgentAvailable(step.agentCode, step.agentVersion);

        const output = await this.agentRunner.invoke({
          agentCode: step.agentCode,
          agentVersion: step.agentVersion,
          nodeId: step.nodeId,
          input: mappedInput,
          config: node.config,
          attempt: step.attempt,
        });

        step.outputJson = output;
        step.status = ExecutionStepStatus.COMPLETED;
        // ...
        currentExecution.contextJson = applyOutputMapping(context, output, node.outputMapping);
        await this.executionsRepository.save(currentExecution);
        return 'completed';
```

**Why re-check agent on every attempt:** An agent can be disabled mid-run; fail closed rather than call a disabled model.

**Careful:** Ready nodes are processed **sequentially** in a `for` loop even when the DAG allows fan-out. Parallelism is a future change — do not assume concurrent steps today.

Cancel is cooperative: API flips DB status; the worker notices on reload. The Bull job is **not** removed. An in-flight LLM call may finish before the next cancel check.

---

## 4.5 AgentRunner (stub vs LLM)

Port:

```10:12:src/modules/executions/services/agent-runner.types.ts
export interface AgentRunner {
  invoke(params: AgentRunnerInvokeInput): Promise<Record<string, unknown>>;
}
```

LLM path (abridged): resolve agent + published prompt → optional tool enrichment → chat → parse/coerce/validate JSON → sanitize hallucinated URLs.

```47:86:src/modules/executions/llm/llm-agent-runner.service.ts
  async invoke(params: AgentRunnerInvokeInput): Promise<Record<string, unknown>> {
    // ... require published+enabled agent + promptRef ...
    const { version: promptVersion } = await this.promptsService.resolvePublishedByCode(promptRef);
    const promptMessages = buildPromptMessages(/* ... */);

    const { messages, enrichmentBundle } = await this.maybeEnrichWithTools(
      promptMessages,
      agentVersion.toolRefs ?? [],
      params,
    );
```

```113:140:src/modules/executions/llm/llm-agent-runner.service.ts
    const rawContent = await this.chatProvider.chat({
      model,
      messages,
      timeoutMs,
      temperature: this.resolveTemperature(agentVersion.configJson, promptVersion.modelHints),
      jsonMode: true,
      responseSchema,
    });

    assertResponseSize(rawContent, MAX_LLM_RESPONSE_BYTES);
    const parsed = parseModelJsonObject(rawContent);
    let output = coerceOutputAgainstSchema(parsed, agentVersion.outputSchema);
    // ... sanitizeReferencesAgainstAllowlist ...
    validateAgainstOutputSchema(output, agentVersion.outputSchema);
    return output;
```

**Why URL allowlist:** LLMs invent citation URLs. Only URLs seen in tool results or step input survive.

**Careful:** Live tools require `toolRuntime.mode=live`. Default is `stub` — `toolRefs` on the agent silently do nothing. OpenAI/Gemini provider classes currently throw “not implemented”; use `stub` or `ollama` in real environments.

---

# 5. Dependency Injection

## Providers & modules

- **Class providers:** most services/repos (`providers: [AgentsService, ...]`).
- **Global APP_* tokens:** filter, interceptor, guards in `AppModule`.
- **Async factories:** TypeORM, Bull root, JWT, Pino, Throttler — config-driven boot.

Database:

```9:19:src/infrastructure/database/database.module.ts
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfigType>) =>
        typeOrmModuleFactory(configService),
    }),
  ],
  exports: [TypeOrmModule],
})
```

## Injection tokens (Executions)

```7:10:src/modules/executions/constants/executions.constants.ts
export const AGENT_RUNNER = Symbol('AGENT_RUNNER');
/** Selected chat provider implementation (Ollama today; OpenAI/Gemini later). */
export const LLM_CHAT_PROVIDER = Symbol('LLM_CHAT_PROVIDER');
```

```45:45:src/modules/executions/constants/executions.constants.ts
export const TOOL_ADAPTER_REGISTRY = Symbol('TOOL_ADAPTER_REGISTRY');
```

Symbols avoid string collisions and force `@Inject(TOKEN)` at call sites — you cannot accidentally inject the wrong concrete class.

## Factory providers

```56:89:src/modules/executions/executions.module.ts
function createToolAdapterRegistry(
  webSearch: WebSearchAdapter,
  webBrowser: WebBrowserAdapter,
  imageGen: ImageGenerationAdapter,
  objectStorage: ObjectStorageAdapter,
): ToolAdapterRegistry {
  return new ToolAdapterRegistry([webSearch, webBrowser, imageGen, objectStorage]);
}

function createLlmChatProvider(
  config: ConfigService<AllConfigType>,
  ollama: OllamaChatProvider,
): LlmChatProvider {
  const mode = resolveRunnerMode(config);
  if (mode === 'stub' || mode === 'ollama') {
    return ollama;
  }
  // openai / gemini → placeholder classes
}

function createAgentRunner(
  config: ConfigService<AllConfigType>,
  stub: StubAgentRunnerService,
  llm: LlmAgentRunnerService,
): AgentRunner {
  const mode = resolveRunnerMode(config);
  return mode === 'stub' ? stub : llm;
}
```

Registered:

```112:128:src/modules/executions/executions.module.ts
    {
      provide: TOOL_ADAPTER_REGISTRY,
      inject: [WebSearchAdapter, WebBrowserAdapter, ImageGenerationAdapter, ObjectStorageAdapter],
      useFactory: createToolAdapterRegistry,
    },
    // ...
    {
      provide: LLM_CHAT_PROVIDER,
      inject: [ConfigService, OllamaChatProvider],
      useFactory: createLlmChatProvider,
    },
    {
      provide: AGENT_RUNNER,
      inject: [ConfigService, StubAgentRunnerService, LlmAgentRunnerService],
      useFactory: createAgentRunner,
    },
```

**Why factories instead of `@Injectable` conditionals:** Mode is process-wide (`AGENT_RUNNER` env). Swap implementations once at boot; orchestrator depends only on the port. Tests can override the Symbol token.

**If removed:** Orchestrator would hard-depend on `LlmAgentRunnerService`, CI could not run deterministic stub fixtures without network/LLM.

---

# 6. Data Flow

```
Request DTO (class-validator)
        │  ValidationPipe whitelist + transform
        ▼
Service business rules (publish checks, pins, required inputs)
        │
        ▼
Entity (TypeORM / jsonb columns)
        │
        ▼
Postgres
        │
        ▼
Response DTO (plainToInstance + @Expose whitelist)
        │
        ▼
ResponseInterceptor → { success, data, meta }
```

Response mapping example:

```366:385:src/modules/executions/services/executions.service.ts
  private toExecutionDto(entity: ExecutionEntity): ExecutionResponseDto {
    return plainToInstance(
      ExecutionResponseDto,
      {
        id: entity.id,
        workflowId: entity.workflowId,
        // ... rename inputJson → input, contextJson → context ...
      },
      { excludeExtraneousValues: true },
    );
  }
```

```6:34:src/modules/executions/dto/execution-response.dto.ts
@Exclude()
export class ExecutionResponseDto {
  @Expose()
  id!: string;
  // ...
  @Expose()
  input!: Record<string, unknown>;

  @Expose()
  context!: Record<string, unknown>;
```

**Why `@Exclude` + `@Expose`:** Fail-closed serialization. New entity columns do not leak until explicitly exposed. Note: `definitionSnapshot` is **intentionally omitted** from the list/detail DTO — poll clients see status/context, not the full frozen graph (load via other means if needed later).

Context mapping between steps:

```23:38:src/modules/executions/services/context-mapper.ts
export function applyInputMapping(
  context: Record<string, unknown>,
  mapping?: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!mapping || Object.keys(mapping).length === 0) {
    return { ...context };
  }
  const result: Record<string, unknown> = {};
  for (const [key, path] of Object.entries(mapping)) {
    if (typeof path === 'string') {
      result[key] = getByPath(context, path);
    } else {
      result[key] = path;
    }
  }
  return result;
}
```

Empty mapping = pass entire context. Non-empty = pick fields (dot-path supported).

---

# 7. Important Design Decisions

| Decision | Why | Trade-off |
|----------|-----|-----------|
| **Feature modules, not layer folders** | Domain boundaries match product language | Cross-cutting lives in `common/` / `infrastructure/` |
| **Repository Data Mapper** | Testable services; no Active Record surprise saves | More boilerplate than injecting `Repository<T>` |
| **Draft / Publish versioning** | Immutable executable artifacts | More tables + status machines |
| **Execution snapshot + agent pins** | Historical runs stay reproducible | Larger jsonb rows; pins can diverge from “latest” later |
| **Async BullMQ execution** | HTTP stays fast; LLM calls are slow | Clients must poll; cancel is cooperative |
| **Ports + Symbol DI for runners** | Swap stub/LLM/tools without rewriting orchestrator | Factories concentrate env knowledge in the module |
| **Permissions on JWT** | Cheap authorization at the edge | Stale permissions until token refresh |
| **No domain EventEmitter** | Simpler mental model for Phase 1 | No reactive side-effects; use queue or explicit calls |
| **Tools adapters under Executions** | Catalog (Tools module) ≠ runtime | Adding a tool means catalog seed **and** adapter registration |

**Why no parallel ready-node execution yet:** Correctness of shared `contextJson` updates is simpler sequential. Parallelism needs locking or per-branch contexts.

**Why OpenAI/Gemini stubs throw:** Interface is ready; shipping fake HTTP clients would hide misconfiguration. Fail loud when `AGENT_RUNNER=openai`.

---

# 8. Common Patterns Used

Explained as **this project uses them**, not textbook definitions.

### Repository

`BaseRepository` + feature repos (`ExecutionsRepository`, `AgentsRepository`, …). Controllers never see TypeORM. Soft-delete and `withTransaction` are shared.

### Strategy / Port

- `AgentRunner` — stub vs LLM
- `LlmChatProvider` — ollama vs future providers
- `ToolAdapter` — one invoke contract per tool code

Selected at boot via factories.

### Factory

`createAgentRunner`, `createLlmChatProvider`, `createToolAdapterRegistry`, plus Nest `forRootAsync` factories for infra.

### Registry

```6:17:src/modules/executions/tools/tool-registry.ts
export class ToolAdapterRegistry {
  private readonly byCode = new Map<string, ToolAdapter>();

  constructor(adapters: ToolAdapter[]) {
    for (const adapter of adapters) {
      this.byCode.set(adapter.code, adapter);
    }
  }

  get(code: string): ToolAdapter | undefined {
    return this.byCode.get(code.trim().toLowerCase());
  }
}
```

`ToolInvokerService` resolves catalog tool → registry adapter by code (`web-search`, `web-browser`, …).

### Adapter

Concrete classes under `executions/tools/adapters/*` wrap HTTP/local storage behind `ToolAdapter.invoke`.

### Builder (product sense)

`WorkflowBuilderService` mutates draft definitions (add node/edge, replace definition). Not a fluent GoF builder — an API surface named for the Workflow Builder UI.

### Orchestrator / Workflow engine

`ExecutionOrchestratorService` owns the run loop; `WorkflowEngineService` is pure DAG readiness. Separation keeps scheduling logic testable without Nest.

### Snapshot

`definitionSnapshot` + `AgentPin[]` freeze the world at start — a deliberate time-travel/repro pattern.

---

# 9. Things Worth Knowing

1. **Executions are async.** `201` with `status: "pending"` is success. Poll `GET /executions/:id` and `/steps`.
2. **Cancel does not kill the Bull job.** It flips DB status; worker cooperates on the next checkpoint.
3. **No transaction around start+enqueue.** Rare orphan `PENDING` if Redis/Bull is down after insert.
4. **PermissionsGuard ANY-of.** `@Permissions(A, B)` means A **or** B.
5. **Missing `@Permissions` ≠ deny.** Authenticated users pass. Always decorate catalog/runtime routes.
6. **JWT permissions can be stale** after role changes until refresh.
7. **Logout blacklists `jti` in Redis** for access-token TTL — Redis outage during validate fails open/closed depending on Redis client errors (watch ops health).
8. **Code uniqueness often uses `withDeleted: true`** — soft-deleted codes still block reuse.
9. **`toolRuntime.mode` defaults to stub** — live tools off until env says so.
10. **Reference URL sanitization drops hallucinations** — “missing citations” in output often means allowlist, not model silence.
11. **Ready nodes run sequentially** — fan-out graphs still serialize.
12. **Empty workflows complete immediately** — no job.
13. **Manual retry** resets step `attempt` to 0 so auto-retry budget refreshes.
14. **ResponseInterceptor list shape** — return `{ data, meta }` from service; do not pre-wrap `success`.
15. **`src/shared/` is empty** — put cross-feature code in `common/` or export from a module; do not invent a third dumping ground without discussion.
16. **Config is Joi-validated at boot** — bad env fails fast, not mid-request.

---

# 10. End-to-End Example

**API:** `POST /api/v1/workflows/{workflowId}/execute`  
**Body:** `{ "input": { "query": "..." } }`  
**Headers:** `Authorization: Bearer <accessToken>`

Assume seeded published workflow `sample-research-review` (research → review).

### Step 1 — HTTP hits Express + pino

Helmet/CORS/cookies run. Pino assigns `x-request-id`. Prefix/version → controller path `workflows` v1.

### Step 2 — Guards

1. `ThrottlerGuard` — global limit (auth login has a tighter local throttle; execute uses global).
2. `JwtAuthGuard` — not `@Public` → Passport JWT → Redis blacklist check → `request.user`.
3. `PermissionsGuard` — requires `workflows:execute` (ANY match).

### Step 3 — ValidationPipe

`ExecuteWorkflowDto` validated; unknown properties rejected.

### Step 4 — Controller

```21:26:src/modules/executions/controllers/workflow-execute.controller.ts
  async execute(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExecuteWorkflowDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ExecutionResponseDto> {
    return this.executionsService.startFromWorkflow(id, dto, user.sub);
  }
```

`ParseUUIDPipe` rejects bad IDs before the service.

### Step 5 — Service start (sync critical path)

1. Size-check input (≤ 256KB).
2. Load workflow — must be `PUBLISHED`.
3. Resolve version (`dto.version` or `currentVersion`).
4. Validate definition with agent checks.
5. `assertRequiredInputs`.
6. `buildAgentPins` — freeze research/review versions.
7. Build context = variables ∪ input ∪ `{ input }`.
8. Insert `executions` row `PENDING` + two `execution_steps` `PENDING`.
9. `executionQueue.add('run-execution', { executionId })`.

### Step 6 — HTTP response

`toExecutionDto` → interceptor wraps:

```json
{
  "success": true,
  "data": {
    "id": "...",
    "status": "pending",
    "workflowCode": "sample-research-review",
    "input": { "query": "..." },
    "context": { "...": "..." }
  },
  "meta": {}
}
```

Request thread ends here.

### Step 7 — Bull worker

`ExecutionProcessor` → `ExecutionOrchestratorService.run`:

1. `PENDING` → `RUNNING`.
2. Engine reports research node ready (no predecessors).
3. `applyInputMapping` → `agentRunner.invoke` (stub fixtures or Ollama).
4. On success: step `COMPLETED`, `applyOutputMapping` updates `contextJson`.
5. Review node becomes ready → same path.
6. All steps completed → execution `COMPLETED`.

On agent throw: step `RETRYING` until `maxRetries`, then `FAILED` → execution `FAILED`.

### Step 8 — Client observes

`GET /api/v1/executions/:id` and `GET .../steps` (need `executions:read`). Same guard/interceptor path as above; service only reads repositories.

### Step 9 — Errors (if any sync)

`AppException` / validation → `GlobalExceptionFilter`:

```json
{
  "success": false,
  "error": { "code": "WORKFLOW_NOT_FOUND", "message": "...", "details": null },
  "timestamp": "...",
  "path": "/api/v1/workflows/.../execute"
}
```

---

## Closing notes for new teammates

When you change behavior, ask:

1. **Does this belong in catalog (sync) or runtime (async)?** Mixing them creates timeouts and half-written state.
2. **Are you freezing versions?** Anything executable should pin or publish deliberately.
3. **Did you decorate permissions?** Global JWT alone is not authorization.
4. **Will ResponseInterceptor / DTO exclude surprise you?** Prefer `@Expose` and `{ data, meta }` list returns.

Welcome aboard — start by running a seeded workflow end-to-end with `AGENT_RUNNER=stub`, then flip to `ollama` and watch the same orchestrator path with a different port implementation.
)
