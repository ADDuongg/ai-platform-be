# Product Backlog

---

# Phase 1 — Platform Foundation

## Authentication & Authorization (Auth + RBAC)

Priority: Critical

Status: Done

Spec: `specs/001-auth-rbac`

Notes: Auth+RBAC module implemented (login/refresh cookie/logout/RBAC guards/users admin/roles/seed). Validate via `pnpm migration:run && pnpm seed` then quickstart scenarios.

Dependency

Platform bootstrap (NestJS foundation) — ✅ satisfied

Goal

Cung cấp danh tính người dùng và kiểm soát truy cập cho toàn bộ Platform trước khi mở Workflow / Agent / Execution.

Mọi API nghiệp vụ (Workflow, Agent, Prompt, Tool, Execution) phải đi qua Auth + RBAC.

---

### Scope

In scope

- JWT Authentication (Access Token + Refresh Token)
- RBAC (Role-Based Access Control)
- User account lifecycle
- Session / token revocation
- Permission kiểm tra ở tầng API (Guard), không chỉ ẩn UI

Out of scope (Phase sau)

- SSO / OAuth2 social login
- Organization / multi-tenant isolation
- Fine-grained ABAC (attribute-based) theo từng Workflow instance
- MFA / Passkey

---

### Roles

| Role | Mô tả | Ví dụ quyền |
|------|--------|-------------|
| `super_admin` | Toàn quyền hệ thống | Quản trị roles, users, toàn bộ registry |
| `admin` | Quản trị Platform | CRUD Agent / Prompt / Tool / User (không đổi super_admin) |
| `designer` | Xây dựng Workflow | CRUD Workflow, dùng Agent/Prompt/Tool đã publish, chạy Execution |
| `operator` | Vận hành | Xem Workflow published, chạy Execution, xem history |
| `viewer` | Chỉ đọc | Xem Workflow / Execution / Agent metadata (không chạy, không sửa) |

Ghi chú

- Một User có thể có nhiều Role.
- Permission gắn với Role (seed mặc định); Admin có thể điều chỉnh mapping sau.
- Guard kiểm tra **Permission** (không hard-code Role ở business service) để dễ mở rộng.

---

### Permission Model

Định dạng: `resource:action`

Resources (Phase 1)

- `users`
- `roles`
- `workflows`
- `agents`
- `prompts`
- `tools`
- `executions`

Actions

- `create` | `read` | `update` | `delete`
- `execute` (riêng cho workflows / executions)
- `publish` (riêng cho workflows / agents / prompts)
- `manage` (admin-level trên resource)

Ví dụ Permission

- `users:read` · `users:create` · `users:update` · `users:delete`
- `roles:manage`
- `workflows:create` · `workflows:read` · `workflows:update` · `workflows:delete` · `workflows:execute` · `workflows:publish`
- `agents:create` · `agents:read` · `agents:update` · `agents:delete` · `agents:publish`
- `prompts:create` · `prompts:read` · `prompts:update` · `prompts:delete` · `prompts:publish`
- `tools:create` · `tools:read` · `tools:update` · `tools:delete`
- `executions:read` · `executions:create` · `executions:cancel` · `executions:retry`

Default Role → Permission (MVP)

| Permission | super_admin | admin | designer | operator | viewer |
|------------|:-----------:|:-----:|:--------:|:--------:|:------:|
| `*:manage` / full | ✓ | — | — | — | — |
| users CRUD | ✓ | ✓ | — | — | — |
| roles:manage | ✓ | — | — | — | — |
| workflows CRUD + publish | ✓ | ✓ | ✓ | — | — |
| workflows:execute | ✓ | ✓ | ✓ | ✓ | — |
| workflows:read | ✓ | ✓ | ✓ | ✓ | ✓ |
| agents / prompts / tools CRUD | ✓ | ✓ | read(+assign) | read | read |
| executions create/cancel/retry | ✓ | ✓ | ✓ | ✓ | — |
| executions:read | ✓ | ✓ | ✓ | ✓ | ✓ |

---

### Authentication (JWT)

Strategy

- Access Token: JWT ngắn hạn (ví dụ 15 phút), chứa `sub`, `email`, `roles`, `permissions` (hoặc permission version/hash)
- Refresh Token: opaque hoặc JWT dài hạn (ví dụ 7 ngày), lưu **hash** trong DB, rotate mỗi lần refresh
- Logout / revoke: invalidate refresh token (và optionally blacklist access `jti` ngắn hạn trên Redis)

Security requirements

- Password hash bằng `argon2` hoặc `bcrypt`
- Rate limit login / refresh / register
- Không trả password hash / refresh token thô ra API
- CORS + Helmet đã có ở foundation

---

### Features

#### Auth — Account & Session

- Register User
- Login (email + password → access + refresh)
- Refresh Token (rotate)
- Logout (revoke refresh)
- Logout All Sessions
- Get Current User (`/me`)
- Change Password
- Forgot / Reset Password (email token — có thể stub nếu chưa có mailer)

#### Auth — Token & Security

- JWT Access Token issue / validate
- Refresh Token store (hashed) + rotate
- Token Revocation (Redis blacklist cho access `jti` khi cần)
- Rate Limiting trên auth endpoints
- Login Attempt Lockout (sau N lần sai)

#### Users

- List Users (admin)
- Get User by ID
- Update User Profile
- Update User Status (`active` | `inactive` | `suspended` | `pending`)
- Soft Delete User

#### RBAC

- Seed Roles & Permissions
- Assign Roles to User
- List Roles / Permissions
- Update Role–Permission mapping (super_admin)
- `JwtAuthGuard` + `RolesGuard` / `PermissionsGuard` trên mọi route nghiệp vụ
- `@Public()` cho login / register / health / docs
- `@Permissions(...)` decorator trên controller

#### Audit (tối thiểu)

- Ghi log sự kiện: login success/fail, logout, role change, password change
- Không log secret / PII thừa

---

### API Surface (Backlog design)

| Method | Path | Auth | Permission |
|--------|------|------|------------|
| POST | `/api/v1/auth/register` | Public | — |
| POST | `/api/v1/auth/login` | Public | — |
| POST | `/api/v1/auth/refresh` | Public (refresh cookie/body) | — |
| POST | `/api/v1/auth/logout` | JWT | — |
| POST | `/api/v1/auth/logout-all` | JWT | — |
| GET | `/api/v1/auth/me` | JWT | — |
| PATCH | `/api/v1/auth/password` | JWT | — |
| GET | `/api/v1/users` | JWT | `users:read` |
| GET | `/api/v1/users/:id` | JWT | `users:read` |
| PATCH | `/api/v1/users/:id` | JWT | `users:update` |
| PATCH | `/api/v1/users/:id/roles` | JWT | `roles:manage` |
| GET | `/api/v1/roles` | JWT | `roles:manage` hoặc `users:read` |
| GET | `/api/v1/permissions` | JWT | `roles:manage` |

---

### Data Model (logical)

- `users` — id, email, password_hash, name, status, timestamps, soft delete
- `roles` — id, code, name, description
- `permissions` — id, code, resource, action, description
- `user_roles` — user_id, role_id
- `role_permissions` — role_id, permission_id
- `refresh_tokens` — id, user_id, token_hash, expires_at, revoked_at, user_agent, ip
- `auth_audit_logs` — id, user_id, event, meta, created_at

---

### Acceptance Criteria

- Không có JWT hợp lệ → 401 trên mọi route không `@Public()`
- Có JWT nhưng thiếu permission → 403
- Refresh rotate: token cũ không tái sử dụng được (reuse detection → revoke family nếu implement)
- Password không bao giờ xuất hiện trong response / log
- Seed được 5 roles + permission matrix ở trên sau `migration:run`
- Health / Swagger docs vẫn public
- Module Auth độc lập (`modules/auth`, `modules/users`); Workflow modules chỉ phụ thuộc Guard/decorator

---

### Implementation Notes (Engineering)

- Tiếp nối scaffold hiện có: `AuthModule`, `JwtStrategy`, `JwtAuthGuard`, `RolesGuard`, `@Public`, `@Roles`, `@CurrentUser`
- Bổ sung `PermissionsGuard` + `@Permissions()` — ưu tiên permission-based checks
- Repository Pattern + soft delete (đúng foundation)
- Không Active Record
- Queue (BullMQ) dùng sau cho gửi email reset password — không block request

---

---

## Agent Registry

Priority: Critical

Status: Done

Spec: `specs/002-agent-registry`

Notes: Agent Registry implemented (CRUD/versioning/enable-archive/seed Research+Review). Validate via `pnpm migration:run && pnpm seed` then quickstart scenarios in `specs/002-agent-registry/quickstart.md`.

Dependency

Authentication & Authorization — ✅ satisfied (Auth+RBAC implemented; Status Done)

Goal

Đăng ký và quản lý AI Agent như capability độc lập, có thể tái sử dụng trên nhiều Workflow — trước khi mở Workflow Management / Builder / Execution.

Agent không thuộc Workflow nào; Workflow chỉ tham chiếu Agent đã publish.

---

### Scope

In scope

- Agent CRUD (metadata + configuration schema)
- Agent lifecycle: `draft` → `published` → `archived` (soft-delete); disable via separate `enabled` flag
- Agent versioning (immutable published versions; parallel draft version while Agent stays published)
- Enable / Disable Agent (`enabled` boolean; does not change status)
- List / Get Agent (filter theo status, capability type; non-admins see published only)
- RBAC: `agents:create` · `agents:read` · `agents:update` · `agents:delete` · `agents:publish` (đã seed trong Auth)

Out of scope (Phase sau)

- Agent runtime / LLM invocation (thuộc Execution Engine)
- Prompt / Tool binding UI đầy đủ (Prompt Library & Tool Library)
- Agent Marketplace / shared library đa tenant
- Hot-swap Agent trong Execution đang chạy
- External Agent (HTTP webhook agent) — chỉ stub metadata nếu cần

---

### Deliverables

- `modules/agents` (NestJS domain module)
- Entity + migration: `agents`, `agent_versions`
- REST API `/api/v1/agents`
- Repository Pattern + soft delete
- Contract OpenAPI + quickstart scenarios
- Unit / integration tests cho service & permission guards

---

### Features

#### Registry — Lifecycle

- Register Agent (create draft)
- Update Agent metadata / config (draft only hoặc tạo version mới)
- Publish Agent (`agents:publish`)
- Enable / Disable Agent
- Soft Delete Agent (chặn nếu còn Workflow đang reference — enforce khi có Workflow module; MVP: soft delete + status `archived`)
- List Agents / Get by ID (và optionally by code)

#### Registry — Versioning

- Create new version from published agent
- List versions of an agent
- Get specific version
- Published version immutable (config/prompt refs không sửa tại chỗ)

#### Registry — Configuration

- Agent `code` (unique slug), `name`, `description`
- `capability_type` (ví dụ: `research` | `image_search` | `analysis` | `generation` | `review` | `translation` | `custom`)
- Input / output JSON Schema (hoặc structured JSON) để Workflow Builder map context
- Default timeout / retry policy metadata (Execution Engine đọc sau)
- Optional references: default prompt code, allowed tool codes (string refs — không FK bắt buộc tới Prompt/Tool module chưa có)

---

### API Surface (Backlog design)

| Method | Path | Auth | Permission |
|--------|------|------|------------|
| POST | `/api/v1/agents` | JWT | `agents:create` |
| GET | `/api/v1/agents` | JWT | `agents:read` |
| GET | `/api/v1/agents/:id` | JWT | `agents:read` |
| PATCH | `/api/v1/agents/:id` | JWT | `agents:update` |
| POST | `/api/v1/agents/:id/publish` | JWT | `agents:publish` |
| POST | `/api/v1/agents/:id/disable` | JWT | `agents:update` |
| POST | `/api/v1/agents/:id/enable` | JWT | `agents:update` |
| DELETE | `/api/v1/agents/:id` | JWT | `agents:delete` |
| GET | `/api/v1/agents/:id/versions` | JWT | `agents:read` |
| GET | `/api/v1/agents/:id/versions/:version` | JWT | `agents:read` |
| POST | `/api/v1/agents/:id/versions` | JWT | `agents:update` |

---

### Data Model (logical)

- `agents` — id, code (unique), name, description, capability_type, status, current_version, enabled, created_by, timestamps, soft delete
- `agent_versions` — id, agent_id, version (int), config_json, input_schema, output_schema, timeout_ms, max_retries, prompt_ref, tool_refs[], changelog, published_at, created_by, timestamps

---

### Acceptance Criteria

- Không JWT → 401; thiếu permission → 403 trên mọi agent route
- `code` unique; tạo trùng → 409
- Publish chỉ từ `draft` (hoặc version draft); published version không sửa được config
- Disable agent: vẫn `agents:read` được; Workflow Builder sau này không cho gán agent disabled
- Soft-deleted agent không xuất hiện ở list mặc định
- Seed/demo: ít nhất 1–2 agent mẫu (Research, Review) sau migration (optional seed task)
- Module độc lập `modules/agents`; chỉ phụ thuộc Auth guards/decorators + common infra

---

### Implementation Notes (Engineering)

- Tuân ARCHITECTURE: Agent Independence — không gọi agent khác, không biết workflow
- Repository Pattern; không Active Record
- JSON columns cho schema/config (PostgreSQL `jsonb`)
- Không implement Execution / LLM call trong feature này
- Permissions đã có trong RBAC seed — không đổi matrix trừ khi thiếu action

---

---

## Workflow Management

Priority: Critical

Status: Done

Spec: `specs/003-workflow-management`

Notes: Workflow Management implemented (CRUD/versioning/clone/archive/seed sample-empty-workflow). Validate via `pnpm migration:run && pnpm seed` then quickstart in `specs/003-workflow-management/quickstart.md`.

Dependency

Authentication & Authorization — ✅ satisfied · **Agent Registry** — ✅ satisfied (Status Done; nodes will reference published agents)

Goal

Quản lý lifecycle và version của Workflow Definition (metadata + definition shell) như dữ liệu configuration-driven — trước khi mở Workflow Builder (graph edit) và Execution.

Workflow là dữ liệu (nodes/edges/variables), không hard-code trong source. Feature này tạo registry/catalog Workflow; **không** chỉnh graph node/edge (thuộc Workflow Builder) và **không** chạy Execution.

---

### Scope

In scope

- Workflow CRUD (metadata: code, name, description, tags/category)
- Workflow lifecycle: `draft` → `published` → `archived` (soft-delete)
- Workflow versioning (immutable published versions; parallel draft version while Workflow stays `published`)
- Clone Workflow (tạo draft mới từ version đã chọn)
- List / Get Workflow (filter theo status; non-designer readers see published only — align Auth matrix)
- Definition storage shell: `definition_json` (nodes, edges, variables, policies) — create với graph rỗng / tối thiểu; mutate graph thuộc Builder
- Publish Workflow (`workflows:publish`) khi definition đạt validation tối thiểu (MVP: có thể publish empty graph; Builder/Execution siết sau)
- RBAC: `workflows:create` · `workflows:read` · `workflows:update` · `workflows:delete` · `workflows:publish` (đã seed trong Auth; designer được CRUD+publish)

Out of scope (Phase sau / feature khác)

- Workflow Builder APIs (add/remove/replace/reorder/connect agents, configure node I/O mapping) — feature **Workflow Builder**
- Execute / cancel / retry — feature **Execution**
- Triggers (schedule, webhook), approval gates, marketplace/templates
- Hot-edit definition của Execution đang chạy
- Active / Deprecated lifecycle states từ SYSTEM_DESIGN (MVP gộp: `published` = usable; deprecate = soft-archive hoặc disable sau)

---

### Deliverables

- `modules/workflows` (NestJS domain module)
- Entity + migration: `workflows`, `workflow_versions`
- REST API `/api/v1/workflows`
- Repository Pattern + soft delete
- Contract OpenAPI + quickstart scenarios
- Unit / integration tests cho service & permission / visibility rules
- Optional seed: ≥1 draft hoặc published sample workflow (empty graph) để Builder/demo

---

### Features

#### Registry — Lifecycle

- Create Workflow (draft; unique `code`; empty definition shell)
- Update Workflow metadata (draft / draft version only cho contract fields)
- Publish Workflow (`workflows:publish`)
- Soft Delete Workflow → `archived` (ẩn khỏi list mặc định; `code` vẫn reserved)
- List Workflows / Get by ID (và optionally by code)
- Clone Workflow → Workflow draft mới (copy metadata + definition từ version nguồn; `code` mới)

#### Registry — Versioning

- Create new version from published workflow (Agent Registry pattern: status Agent-level stays `published`)
- List versions / Get specific version
- Published version immutable (definition + version-bound metadata không sửa tại chỗ)

#### Registry — Definition shell (read/store only)

- `definition_json`: `{ nodes: [], edges: [], variables?: {}, policies?: {} }` (shape align `docs/engineering/WORKFLOW_ENGINE.md`)
- Node agent refs (khi có): opaque agent `code` hoặc id string — **không** enforce FK cứng tới agents nếu Builder chưa ship; optional validate published+enabled khi publish nếu Agent Registry available
- Không expose Builder mutation endpoints trong feature này

---

### API Surface (Backlog design)

| Method | Path | Auth | Permission |
|--------|------|------|------------|
| POST | `/api/v1/workflows` | JWT | `workflows:create` |
| GET | `/api/v1/workflows` | JWT | `workflows:read` |
| GET | `/api/v1/workflows/:id` | JWT | `workflows:read` |
| PATCH | `/api/v1/workflows/:id` | JWT | `workflows:update` |
| POST | `/api/v1/workflows/:id/publish` | JWT | `workflows:publish` |
| POST | `/api/v1/workflows/:id/clone` | JWT | `workflows:create` |
| DELETE | `/api/v1/workflows/:id` | JWT | `workflows:delete` |
| GET | `/api/v1/workflows/:id/versions` | JWT | `workflows:read` |
| GET | `/api/v1/workflows/:id/versions/:version` | JWT | `workflows:read` |
| POST | `/api/v1/workflows/:id/versions` | JWT | `workflows:update` |

Visibility (MVP, mirror Agent Registry spirit + Auth matrix)

- `designer` / `admin` / `super_admin`: list/get mọi non–soft-deleted status (kể cả draft)
- `operator` / `viewer`: **published** only (draft không leak)
- Mutate: `workflows:create|update|delete|publish` theo seed (designer+admin+super_admin)

---

### Data Model (logical)

- `workflows` — id, code (unique), name, description, status, current_version, tags/category (optional), created_by, timestamps, soft delete
- `workflow_versions` — id, workflow_id, version (int), status (`draft` \| `published`), definition_json (jsonb), changelog, published_at, created_by, timestamps

---

### Acceptance Criteria

- Không JWT → 401; thiếu permission → 403 trên mọi workflow route
- `code` unique among **active** (non–soft-deleted) Workflows; tạo trùng active → 409; archive rồi tạo lại cùng code → allowed
- Publish tạo/confirm immutable published version; sửa definition của published version tại chỗ → rejected
- Parallel draft version khi workflow đang `published` (admin/designer only thấy draft version)
- Operator/viewer không thấy draft workflows
- Clone tạo workflow draft mới với `code` khác và copy definition
- Soft-deleted không xuất hiện ở list mặc định
- Module độc lập `modules/workflows`; phụ thuộc Auth guards + (optional read) Agent Registry cho validate refs — **không** import Execution / Builder modules
- Không implement execute / LLM / graph-builder mutation APIs

---

### Implementation Notes (Engineering)

- Tuân ARCHITECTURE: Configuration-Driven; Workflow = data; Agent Independence (workflow không chứa business logic agent)
- Align versioning pattern với Agent Registry (`002-agent-registry`) để giảm cognitive load
- Repository Pattern; không Active Record; PostgreSQL `jsonb` cho `definition_json`
- Permissions đã seed — không đổi matrix trừ khi thiếu action
- Tách rõ với **Workflow Builder**: Management chỉ lifecycle + version snapshot; Builder mới mutate nodes/edges

---

---

## Workflow Builder

Priority: Critical

Status: Done

Spec: `specs/004-workflow-builder`

Notes: Workflow Builder implemented (definition get/put/validate, nodes CRUD-lite, edges add/remove, agent assignability, cycle rejection). Validate via `pnpm migration:run && pnpm seed` then quickstart in `specs/004-workflow-builder/quickstart.md`. Unit tests: `pnpm exec jest src/modules/workflows`.

Dependency

Authentication & Authorization — ✅ satisfied · Agent Registry — ✅ satisfied · Workflow Management — ✅ satisfied (Status Done)

Goal

Cho phép designer/admin chỉnh sửa **graph definition** của Workflow (nodes = Agent steps, edges = dependencies, I/O mapping, node config) trên **draft version** — sau khi đã có Workflow Management (lifecycle/version shell) và Agent Registry (capability để gán).

Builder **không** tạo/publish/archive Workflow (thuộc Management) và **không** chạy Execution. Builder chỉ mutate `definition_json` của draft version theo các thao tác graph có kiểm soát.

---

### Scope

In scope

- Add Node (gán Agent published + enabled từ Agent Registry)
- Remove Node (và cascade/cleanup edges liên quan)
- Replace Agent trên Node (đổi agent ref; giữ node id nếu có thể)
- Reorder / reposition Node metadata (display order / layout hints — không đổi semantics execution nếu edges không đổi)
- Connect / Disconnect Nodes (edges: from → to dependency)
- Configure Node: input mapping, output mapping, timeout/retry overrides, node-level config JSON
- Configure Workflow-level definition extras trên draft: `variables`, `policies` (shell đã có từ Management)
- Validate graph tối thiểu khi mutate / khi chuẩn bị publish: agent tồn tại + published + enabled; edge endpoints tồn tại; không self-loop; không orphan edge; optional cycle detection (MVP: reject cycles)
- Chỉ mutate **draft** version (published immutable — enforce từ Management; Builder API từ chối nếu không có draft)
- RBAC: `workflows:update` cho mọi graph mutate; `workflows:read` để get definition; publish vẫn qua Management `workflows:publish`

Out of scope (Phase sau / feature khác)

- Execute / cancel / retry — feature **Execution**
- Conditional branch / loop / human approval / sub-workflow — Future Capabilities (WORKFLOW_ENGINE)
- Prompt Library / Tool Library binding UI đầy đủ (MVP: giữ string refs trên node config nếu cần; không CRUD Prompt/Tool)
- Visual layout canvas persistence nâng cao (MVP: optional `position` trên node; không bắt buộc FE canvas protocol)
- Hot-edit definition của Execution đang chạy
- Auto-layout / AI suggest graph
- Bulk replace agent across all workflows

---

### Deliverables

- Graph mutation APIs trên `modules/workflows` (hoặc `modules/workflows/builder` sub-layer) — **không** tạo domain module tách rời khỏi Workflow Registry
- Typed node/edge DTOs + validation (class-validator); persist vào `workflow_versions.definition_json` (jsonb sẵn có)
- Optional validate Agent via Agent Registry read service (published + enabled)
- Contract OpenAPI + quickstart scenarios cho Builder operations
- Unit / integration tests: graph ops, immutability of published, agent assignability, cycle/orphan rejection
- Không migration schema mới nếu `definition_json` đủ (chỉ siết shape/validation)

---

### Features

#### Builder — Nodes

- Add Node: chọn `agentCode` (hoặc agent id) → tạo node với `id` ổn định (uuid/slug), default mappings rỗng
- Remove Node: xóa node + mọi edge `from`/`to` trỏ tới node đó
- Replace Agent on Node: đổi `agentCode` / version pin (MVP: pin `agentCode` + optional `agentVersion`; default = current published)
- Update Node config: inputMapping, outputMapping, timeoutMs, maxRetries, config JSON, label/position

#### Builder — Edges

- Add Edge: `fromNodeId` → `toNodeId` (dependency: target chạy sau khi source completed)
- Remove Edge
- Reject duplicate edge, self-loop, missing endpoints, cycles (MVP hard-reject cycles)

#### Builder — Workflow definition config

- Patch draft `variables` / `policies` (merge hoặc replace có document rõ)
- Get current draft definition (convenience read; cũng có qua Management get version)

#### Builder — Validation helpers

- `POST .../validate` (optional MVP): dry-run graph validation without persist
- On Management publish: có thể gọi chung validator (siết hơn empty-graph rule của Management — Builder ship trước thì publish vẫn cho empty; sau Builder: recommend validate before publish; **MVP decision**: Management publish vẫn cho empty; Builder validate bắt buộc trên mỗi mutate op)

---

### API Surface (Backlog design)

Base: draft version của Workflow đã tồn tại (tạo Workflow / create version qua Management).

| Method | Path | Auth | Permission |
|--------|------|------|------------|
| GET | `/api/v1/workflows/:id/definition` | JWT | `workflows:read` (+ draft visibility như Management) |
| PUT | `/api/v1/workflows/:id/definition` | JWT | `workflows:update` | replace toàn bộ draft definition (escape hatch; vẫn validate) |
| POST | `/api/v1/workflows/:id/nodes` | JWT | `workflows:update` |
| PATCH | `/api/v1/workflows/:id/nodes/:nodeId` | JWT | `workflows:update` |
| DELETE | `/api/v1/workflows/:id/nodes/:nodeId` | JWT | `workflows:update` |
| POST | `/api/v1/workflows/:id/edges` | JWT | `workflows:update` |
| DELETE | `/api/v1/workflows/:id/edges/:edgeId` | JWT | `workflows:update` |
| POST | `/api/v1/workflows/:id/definition/validate` | JWT | `workflows:read` hoặc `workflows:update` |

Notes

- Mọi mutate chỉ áp dụng khi Workflow có **draft version** hiện hành; không có draft → 409 (create version qua Management trước).
- Operator/viewer: GET definition chỉ với Workflow **published** (current published version); không mutate; không đọc draft definition.
- Không thêm permission code mới.

---

### Data Model (logical — inside `definition_json`)

```text
definition_json:
  nodes: [
    {
      id, type: "agent",
      agentCode, agentVersion?,   // ref Agent Registry
      label?, position?: { x, y },
      inputMapping?: {}, outputMapping?: {},
      timeoutMs?, maxRetries?,
      config?: {}
    }
  ]
  edges: [
    { id, from, to, condition?: null }  // condition reserved; MVP null/omit
  ]
  variables?: {}
  policies?: {}
```

- Không bảng SQL mới cho node/edge (configuration-driven; version snapshot đã có).
- Agent ref là opaque string + validate lúc mutate; không FK cứng SQL tới `agents` (tránh cascade cross-module; align Management notes).

---

### Acceptance Criteria

- Không JWT → 401; thiếu `workflows:update` → 403 trên mọi mutate Builder
- Add node với agent không tồn tại / không published / disabled → 400/422
- Remove node xóa sạch edges liên quan
- Add edge tạo cycle → rejected
- Mutate khi chỉ có published version (không draft) → 409
- Published version definition không đổi khi Builder mutate draft song song
- Operator/viewer không đọc được draft definition; designer/admin được
- PUT full definition và partial node/edge APIs cho kết quả equivalent sau validate
- Module vẫn nằm trong Workflow domain; chỉ phụ thuộc Auth + Agent Registry read; **không** import Execution

---

### Implementation Notes (Engineering)

- Tuân ARCHITECTURE: Configuration-Driven; Agent Independence (node không “gọi” node khác — chỉ edges mô tả dependency)
- Align `docs/engineering/WORKFLOW_ENGINE.md` node/edge/context mapping
- Tách rõ với **Workflow Management**: Management = lifecycle/version/clone; Builder = graph ops trên draft `definition_json`
- Reuse `WorkflowsService` / versions repository; extract `WorkflowDefinitionValidator` / `WorkflowGraphService` nếu service phình to
- Repository Pattern; không Active Record
- Permissions đã seed — không đổi matrix

---

---

## Prompt Library

Priority: High

Status: Done

Spec: `specs/006-prompt-library`

Dependency

Authentication & Authorization — ✅ satisfied (Auth+RBAC implemented; Status Done) · Agent Registry — ✅ satisfied (Status Done; Agents already store opaque `promptRef` string)

Notes: Prompt Library implemented (CRUD/versioning/enable-archive/by-code/Agent promptRef validation/seed research-brief). Validate via `pnpm migration:run && pnpm seed` then quickstart in `specs/006-prompt-library/quickstart.md`. Unit tests: `pnpm exec jest src/modules/prompts`.

Goal

Đăng ký và quản lý Prompt như artifact độc lập, versioned, có thể gán cho nhiều Agent (qua `promptRef`) — để Execution Engine sau này resolve prompt content từ code đã pin, không hard-code prompt trong source.

Prompt không thuộc Workflow; Workflow không tham chiếu Prompt trực tiếp. Agent (và sau này Execution snapshot) mới tham chiếu Prompt đã publish.

---

### Scope

In scope

- Prompt CRUD (metadata + template content / messages)
- Prompt lifecycle: `draft` → `published` → `archived` (soft-delete); disable via separate `enabled` flag (mirror Agent Registry)
- Prompt versioning (immutable published versions; parallel draft version while Prompt stays `published`)
- Enable / Disable Prompt (`enabled` boolean; does not change status)
- List / Get Prompt (filter theo status, category/tag; non-admins see published only)
- Prompt Assignment (MVP): validate & set Agent `promptRef` to a **published + enabled** Prompt `code` when updating Agent version config; optional convenience endpoint to assign/clear prompt on an Agent draft version
- Resolve Prompt by `code` (+ optional version) for consumers (Agent/Execution read path later)
- RBAC: `prompts:create` · `prompts:read` · `prompts:update` · `prompts:delete` · `prompts:publish` (đã seed trong Auth)

Out of scope (Phase sau)

- LLM invocation / prompt rendering trong Execution (thuộc Execution Agent runner enhancement)
- Prompt A/B testing, eval suites, auto-optimize
- Shared / Marketplace Prompt Library đa tenant (Milestone 5)
- Variable interpolation engine nâng cao (MVP: store template + documented `variables` schema; runtime render thuộc Execution)
- Binding Prompt trực tiếp lên Workflow node (MVP: chỉ qua Agent `promptRef`)
- Multi-locale prompt packs

---

### Deliverables

- `modules/prompts` (NestJS domain module)
- Entity + migration: `prompts`, `prompt_versions`
- REST API `/api/v1/prompts`
- Optional assignment hook: validate `promptRef` when Agents module sets/updates it (read Prompts by code; không tạo FK cứng SQL)
- Repository Pattern + soft delete
- Contract OpenAPI + quickstart scenarios
- Unit / integration tests cho service, visibility rules & permission guards
- Seed ≥1 published sample Prompt and MUST set ≥1 sample Agent `promptRef` to that code (idempotent)

---

### Features

#### Registry — Lifecycle

- Create Prompt (draft; unique `code`)
- Update Prompt metadata / content (draft / draft version only)
- Publish Prompt (`prompts:publish`)
- Enable / Disable Prompt
- Soft Delete Prompt → `archived` (ẩn khỏi list mặc định; `code` vẫn reserved)
- List Prompts / Get by ID (và by code)

#### Registry — Versioning

- Create new version from published prompt
- List versions / Get specific version
- Published version immutable (template/messages/variables không sửa tại chỗ)

#### Registry — Content

- Prompt `code` (unique slug), `name`, `description`
- Optional `category` / `tags`
- Version payload: `template` (text) và/hoặc `messages` (jsonb chat-style array); optional `variables_schema` (jsonb) mô tả placeholder inputs
- Optional `model_hints` jsonb (temperature, max_tokens…) — metadata only; không gọi LLM trong feature này

#### Assignment — Agent `promptRef`

- When Admin updates Agent draft `promptRef`: MUST reject if Prompt code missing / not published / disabled / soft-deleted (422)
- Clear `promptRef` (`null`) always allowed
- Designer: `prompts:read` only (+ “assign” means consume published catalog when configuring Agents they cannot mutate in MVP Auth matrix — assignment mutate stays on Agent update = admin). Document Auth matrix as-is: designer reads published prompts for catalog; admin/super_admin assign via Agent config
- Soft-deleted / disabled Prompt: historical Agent versions may keep stale `promptRef` string; new assignment blocked

---

### API Surface (Backlog design)

| Method | Path | Auth | Permission |
|--------|------|------|------------|
| POST | `/api/v1/prompts` | JWT | `prompts:create` |
| GET | `/api/v1/prompts` | JWT | `prompts:read` |
| GET | `/api/v1/prompts/:id` | JWT | `prompts:read` |
| GET | `/api/v1/prompts/by-code/:code` | JWT | `prompts:read` |
| PATCH | `/api/v1/prompts/:id` | JWT | `prompts:update` |
| POST | `/api/v1/prompts/:id/publish` | JWT | `prompts:publish` |
| POST | `/api/v1/prompts/:id/disable` | JWT | `prompts:update` |
| POST | `/api/v1/prompts/:id/enable` | JWT | `prompts:update` |
| DELETE | `/api/v1/prompts/:id` | JWT | `prompts:delete` |
| GET | `/api/v1/prompts/:id/versions` | JWT | `prompts:read` |
| GET | `/api/v1/prompts/:id/versions/:version` | JWT | `prompts:read` |
| POST | `/api/v1/prompts/:id/versions` | JWT | `prompts:update` |

Visibility (MVP, mirror Agent Registry)

- `admin` / `super_admin`: list/get mọi non–soft-deleted status (kể cả draft)
- `designer` / `operator` / `viewer`: **published** only (draft không leak)
- Mutate: theo seed (`prompts:create|update|delete|publish` — admin/super_admin; designer read)

Assignment mutate lives on existing Agent APIs (`PATCH /agents/:id` `promptRef`) with Prompts validation — no new permission code.

---

### Data Model (logical)

- `prompts` — id, code (unique among active), name, description, category?, tags?, status, current_version, enabled, created_by, timestamps, soft delete
- `prompt_versions` — id, prompt_id, version (int), status (`draft` \| `published`), template (text nullable), messages (jsonb nullable), variables_schema (jsonb), model_hints (jsonb), changelog, published_at, created_by, timestamps

---

### Acceptance Criteria

- Không JWT → 401; thiếu permission → 403 trên mọi prompt route
- `code` unique among **active** (non–soft-deleted) only; tạo trùng active → 409; after soft-delete (`archived`), same `code` MAY be reused by a new Prompt (confirmed clarify 2026-07-15; Workflow Management pattern, not Agent forever-unique)
- Publish tạo/confirm immutable published version; sửa content published version tại chỗ → rejected
- Parallel draft version khi prompt đang `published` (admin-only thấy draft version)
- designer/operator/viewer không thấy draft prompts
- Soft-deleted không xuất hiện ở list mặc định; disable không đổi status nhưng chặn assignment mới
- Set Agent `promptRef` tới prompt không published/enabled → 422; `null` clears OK
- Seed ≥1 published sample Prompt **and** MUST set ≥1 sample Agent `promptRef` to that code (idempotent; clarify 2026-07-15)
- Module độc lập `modules/prompts`; phụ thuộc Auth guards + (optional) Agent update validation hook — **không** import Execution / Builder / Tool modules
- Không implement LLM call / prompt render runtime trong feature này

---

### Implementation Notes (Engineering)

- Tuân ARCHITECTURE: Loose Coupling — Prompt Registry độc lập với Agent/Workflow; Agent giữ opaque `prompt_ref` (không FK SQL bắt buộc)
- Align versioning/visibility/enabled pattern với Agent Registry (`002-agent-registry`) để giảm cognitive load
- Repository Pattern; không Active Record; PostgreSQL `jsonb` cho messages / variables_schema / model_hints
- Permissions đã seed — không đổi matrix trừ khi thiếu action
- Execution vẫn có thể stub runner; resolve Prompt content là enhancement sau khi Library tồn tại
- Feature branch / spec folder: `specs/006-prompt-library`

---

---

## Tool Library

Priority: High

Status: Done

Spec: `specs/007-tool-library`

Notes: Tool Library implemented (CRUD/versioning/enable-archive/by-code/Agent toolRefs validation/seed web-search+web-browser+image-generation+object-storage; Research→web-search, Review→object-storage). Validate via `pnpm migration:run && pnpm seed` then quickstart in `specs/007-tool-library/quickstart.md`. Unit tests: `pnpm exec jest src/modules/tools`.

Dependency

Authentication & Authorization — ✅ satisfied (Auth+RBAC implemented; Status Done) · Agent Registry — ✅ satisfied (Status Done; Agents already store opaque `toolRefs` string[]) · Prompt Library — ✅ satisfied (Status Done; same registry pattern)

Goal

Đăng ký và quản lý Tool như capability độc lập, versioned, có thể gán cho nhiều Agent (qua `toolRefs[]`) — để Execution Engine sau này resolve tool config từ code đã pin, không hard-code tool adapter trong Agent source.

Tool không thuộc Workflow; Workflow không tham chiếu Tool trực tiếp. Agent (và sau này Execution snapshot) mới tham chiếu Tool đã publish.

Tool Registry là catalog + metadata/config schema. **Không** implement runtime adapter (HTTP call, browser, image API) trong feature này — runtime thuộc Execution tool runner enhancement.

---

### Scope

In scope

- Tool CRUD (metadata + config schema / connection metadata)
- Tool lifecycle: `draft` → `published` → `archived` (soft-delete); disable via separate `enabled` flag (mirror Agent / Prompt Registry)
- Tool versioning (immutable published versions; parallel draft version while Tool stays `published`)
- Enable / Disable Tool (`enabled` boolean; does not change status)
- List / Get Tool (filter theo status, `tool_type`; non-admins see published only)
- Tool Assignment (MVP): validate & set Agent `toolRefs` to **published + enabled** Tool `code`s when updating Agent version config; reject unknown / draft / disabled / soft-deleted codes (422); clear to `[]` always allowed
- Resolve Tool by `code` (+ optional version) for consumers (Agent/Execution read path later)
- Seed ≥1 published sample Tool per core `tool_type` used in Milestone 2 planning: `search`, `browser`, `image_generation`, `storage` (config stub / placeholder; no live credentials)
- RBAC: `tools:create` · `tools:read` · `tools:update` · `tools:delete` · `tools:publish` (đã seed trong Auth)

Out of scope (Phase sau)

- Tool runtime / adapter invocation trong Execution (thuộc Execution tool runner enhancement)
- Secret vault / credential encryption beyond storing opaque secret refs (MVP: no raw API keys in DB; `config_json` may hold non-secret endpoint/meta + optional `secretRef` string)
- Tool Marketplace / shared library đa tenant (Milestone 5)
- Binding Tool trực tiếp lên Workflow node (MVP: chỉ qua Agent `toolRefs`)
- Hot-swap Tool trong Execution đang chạy
- Real integrations: SerpAPI, Playwright, DALL·E/Stability, S3 — chỉ đăng ký type + stub config; adapters sau

---

### Deliverables

- `modules/tools` (NestJS domain module)
- Entity + migration: `tools`, `tool_versions`
- REST API `/api/v1/tools`
- Assignment hook: validate `toolRefs` when Agents module sets/updates them (read Tools by code; không tạo FK cứng SQL)
- Repository Pattern + soft delete
- Contract OpenAPI + quickstart scenarios
- Unit / integration tests cho service, visibility rules & permission guards
- Seed ≥1 published sample Tool for types `search` | `browser` | `image_generation` | `storage`, and MUST set ≥1 sample Agent `toolRefs` to include at least one of those codes (idempotent)

---

### Features

#### Registry — Lifecycle

- Create Tool (draft; unique `code` among active)
- Update Tool metadata / config (draft / draft version only)
- Publish Tool (`tools:publish`)
- Enable / Disable Tool
- Soft Delete Tool → `archived` (ẩn khỏi list mặc định; after soft-delete same `code` MAY be reused — align Prompt/Workflow, not Agent forever-unique)
- List Tools / Get by ID (và by code)

#### Registry — Versioning

- Create new version from published tool
- List versions / Get specific version
- Published version immutable (config/input/output schema không sửa tại chỗ)

#### Registry — Configuration

- Tool `code` (unique slug), `name`, `description`
- `tool_type`: `search` | `browser` | `image_generation` | `storage` | `http` | `custom`
- Version payload: `config_json` (jsonb — endpoint/meta/timeout; **no secrets**), optional `input_schema` / `output_schema` (jsonb), optional `secret_ref` (opaque string pointing to external secret store — MVP may be null)
- Optional default timeout / retry metadata for Execution tool runner later

#### Assignment — Agent `toolRefs`

- When Admin updates Agent draft `toolRefs`: MUST reject if any code missing / not published / disabled / soft-deleted (422)
- Empty array `[]` always allowed (clear all)
- Duplicate codes in request → normalize unique or reject (MVP: reject duplicates with 400)
- Soft-deleted / disabled Tool: historical Agent versions may keep stale `toolRefs` strings; new assignment blocked
- Designer: `tools:read` published catalog; assignment mutate stays on Agent update = admin (Auth matrix as-is)

---

### API Surface (Backlog design)

| Method | Path | Auth | Permission |
|--------|------|------|------------|
| POST | `/api/v1/tools` | JWT | `tools:create` |
| GET | `/api/v1/tools` | JWT | `tools:read` |
| GET | `/api/v1/tools/:id` | JWT | `tools:read` |
| GET | `/api/v1/tools/by-code/:code` | JWT | `tools:read` |
| PATCH | `/api/v1/tools/:id` | JWT | `tools:update` |
| POST | `/api/v1/tools/:id/publish` | JWT | `tools:publish` |
| POST | `/api/v1/tools/:id/disable` | JWT | `tools:update` |
| POST | `/api/v1/tools/:id/enable` | JWT | `tools:update` |
| DELETE | `/api/v1/tools/:id` | JWT | `tools:delete` |
| GET | `/api/v1/tools/:id/versions` | JWT | `tools:read` |
| GET | `/api/v1/tools/:id/versions/:version` | JWT | `tools:read` |
| POST | `/api/v1/tools/:id/versions` | JWT | `tools:update` |

Visibility (MVP, mirror Prompt / Agent Registry)

- `admin` / `super_admin`: list/get mọi non–soft-deleted status (kể cả draft)
- `designer` / `operator` / `viewer`: **published** only (draft không leak)
- Mutate: theo seed (`tools:create|update|delete|publish` — admin/super_admin; designer read)

Assignment mutate lives on existing Agent APIs (`PATCH /agents/:id` `toolRefs`) with Tools validation — no new permission code.

---

### Data Model (logical)

- `tools` — id, code (unique among active), name, description, tool_type, status, current_version, enabled, created_by, timestamps, soft delete
- `tool_versions` — id, tool_id, version (int), status (`draft` \| `published`), config_json (jsonb), input_schema (jsonb), output_schema (jsonb), secret_ref (nullable), timeout_ms?, max_retries?, changelog, published_at, created_by, timestamps

---

### Acceptance Criteria

- Không JWT → 401; thiếu permission → 403 trên mọi tool route
- `code` unique among **active** (non–soft-deleted) only; tạo trùng active → 409; after soft-delete (`archived`), same `code` MAY be reused
- Publish tạo/confirm immutable published version; sửa config published version tại chỗ → rejected
- Parallel draft version khi tool đang `published` (admin-only thấy draft version)
- designer/operator/viewer không thấy draft tools
- Soft-deleted không xuất hiện ở list mặc định; disable không đổi status nhưng chặn assignment mới
- Set Agent `toolRefs` chứa code không published/enabled → 422; `[]` clears OK
- Seed ≥1 published Tool per `search` / `browser` / `image_generation` / `storage` **and** MUST set ≥1 sample Agent `toolRefs` to include ≥1 of those codes (idempotent)
- Module độc lập `modules/tools`; phụ thuộc Auth guards + (optional) Agent update validation hook — **không** import Execution / Builder / Prompt modules
- Không implement tool adapter / HTTP / browser / image / storage runtime trong feature này

---

### Implementation Notes (Engineering)

- Tuân ARCHITECTURE: Loose Coupling — Tool Registry độc lập với Agent/Workflow; Agent giữ opaque `tool_refs` (không FK SQL bắt buộc)
- Align versioning/visibility/enabled pattern với Agent Registry (`002`) và Prompt Library (`006`) để giảm cognitive load
- Repository Pattern; không Active Record; PostgreSQL `jsonb` cho config/schemas
- Permissions đã seed (`tools:*` including `tools:publish`) — không đổi matrix trừ khi thiếu action
- Execution vẫn stub runner; resolve/invoke Tool là enhancement sau khi Library tồn tại
- Feature branch / spec folder: `specs/007-tool-library`

---

---

## Execution

Priority: Critical

Status: Done

Spec: `specs/005-workflow-execution`

Notes: Workflow Execution implemented (start/status/steps/cancel/retry, BullMQ orchestrator, stub agent runner, snapshot pins, seed sample-research-review). Validate via `pnpm migration:run && pnpm seed` then quickstart in `specs/005-workflow-execution/quickstart.md`. Unit tests: `pnpm exec jest src/modules/executions`.

Dependency

Authentication & Authorization — ✅ satisfied · Agent Registry — ✅ satisfied · Workflow Management — ✅ satisfied · Workflow Builder — ✅ satisfied (Status Done; published definitions may contain nodes/edges)

Goal

Thực thi Workflow đã publish theo đúng version snapshot: tạo Execution, điều phối nodes theo dependency (Workflow Engine), chạy Agent (Execution Engine), cập nhật Shared Context, lưu step history — và hỗ trợ theo dõi status, cancel, retry.

Execution **không** chỉnh sửa Workflow definition (Management/Builder) và **không** CRUD Agent. Prompt Library / Tool Library chưa bắt buộc: MVP Agent runner dùng agent version config (+ optional stub/LLM adapter); tool refs là opaque strings.

---

### Scope

In scope

- Start Execution từ Workflow **published** (pin `workflow_version`; snapshot `definition_json` + agent version pins lúc start)
- Async orchestration (BullMQ): resolve ready nodes → run agents → merge context → next nodes → complete/fail
- Parallel nodes khi không phụ thuộc nhau (MVP: fan-out ready set; sequential within worker pool limits)
- Execution status + step-level status (Pending / Running / Completed / Failed / Cancelled / Retrying)
- Shared Context: init từ input + workflow variables; agents read via inputMapping, write via outputMapping
- Cancel Execution đang chạy (`executions:cancel`)
- Retry: failed step (theo node retry policy) và/hoặc retry Execution failed từ step lỗi (MVP: retry failed execution từ failed steps; không rewind completed)
- Execution History: list/filter/get + step detail (input/output/status/duration/error)
- RBAC: `workflows:execute` (start) · `executions:create` (align start) · `executions:read` · `executions:cancel` · `executions:retry` (đã seed trong Auth)

Out of scope (Phase sau / feature khác)

- Schedule / webhook / API trigger persistence (Future Capabilities)
- Human approval / pause / resume / checkpoint
- Conditional branch / loop / sub-workflow (condition trên edge reserved; MVP ignore / reject non-null)
- Fallback agent / skip / compensation policies nâng cao (MVP: retry rồi fail step → fail execution theo policy `stop`)
- Prompt Library / Tool Library CRUD & real tool adapters (MVP: string refs; stub or no-op tools)
- Hot-edit definition của Execution đang chạy
- Distributed multi-worker correctness beyond single Redis queue; multi-tenant isolation
- Execution analytics / dashboards

---

### Deliverables

- `modules/executions` (NestJS domain module) + Workflow Engine / Execution Engine services (có thể `modules/executions/engine/`)
- Entity + migration: `executions`, `execution_steps` (và optionally `execution_events` audit tối thiểu)
- REST API `/api/v1/executions` (+ start qua `/api/v1/workflows/:id/execute`)
- BullMQ queue/worker cho async run (reuse `QueueModule`)
- Agent runner port/adapter: load published agent version; MVP invoke (stub hoặc LLM adapter tối thiểu từ agent config) — **không** hard-code business workflow
- Contract OpenAPI + quickstart scenarios
- Unit / integration tests: start, graph order, parallel ready-set, cancel, retry, permissions, snapshot immutability

---

### Features

#### Execution — Start & Orchestrate

- Execute published Workflow (`workflows:execute` / `executions:create`): body = input JSON (+ optional `version`; default = current published)
- Reject start nếu Workflow không published / soft-deleted / definition invalid tối thiểu (empty graph → 422 hoặc complete ngay — **MVP decision**: empty graph → complete with no steps)
- Persist definition snapshot + workflow metadata + resolved agent version pins
- Enqueue run job; API trả Execution `pending`/`running` ngay (202/201 + id)

#### Execution — Status & History

- Get Execution by ID (status, timestamps, error summary, context summary)
- List Executions (filter: workflowId, status, createdBy, date range; pagination)
- List / Get Execution Steps (per-node attempts, I/O, duration, error)
- Operator/viewer: `executions:read` trên mọi execution (MVP: không tenant filter; cùng visibility như Auth matrix)

#### Execution — Cancel & Retry

- Cancel: chỉ khi `pending` | `running`; mark execution + pending steps `cancelled`; best-effort stop in-flight worker
- Auto-retry step theo node/agent `maxRetries` + backoff metadata khi step fail
- Manual Retry Execution (`executions:retry`): chỉ `failed`; re-queue failed steps (giữ completed outputs trong context); không tạo workflow version mới

#### Execution — Engine (internal)

- Workflow Engine: topological ready-set từ edges; không business logic
- Execution Engine: lifecycle start/cancel/retry; update step + context; write history
- Agent Independence: runner chỉ nhận mapped input → trả output; không gọi agent khác; không biết next node

---

### API Surface (Backlog design)

| Method | Path | Auth | Permission |
|--------|------|------|------------|
| POST | `/api/v1/workflows/:id/execute` | JWT | `workflows:execute` |
| POST | `/api/v1/executions` | JWT | `executions:create` (body: `workflowId`, optional `version`, `input`) |
| GET | `/api/v1/executions` | JWT | `executions:read` |
| GET | `/api/v1/executions/:id` | JWT | `executions:read` |
| GET | `/api/v1/executions/:id/steps` | JWT | `executions:read` |
| GET | `/api/v1/executions/:id/steps/:stepId` | JWT | `executions:read` |
| POST | `/api/v1/executions/:id/cancel` | JWT | `executions:cancel` |
| POST | `/api/v1/executions/:id/retry` | JWT | `executions:retry` |

Notes

- Hai cách start (`workflows/:id/execute` vs `POST /executions`) cùng service; giữ cả hai để khớp permission matrix đã seed.
- Không mutate Workflow/Agent từ Execution APIs.
- Response không lộ secret trong agent config / prompt raw nếu có — chỉ metadata + mapped I/O đã lưu.

---

### Data Model (logical)

- `executions` — id, workflow_id, workflow_code, workflow_version, status (`pending` \| `running` \| `completed` \| `failed` \| `cancelled`), input_json, context_json, definition_snapshot (jsonb), error_json?, started_by, started_at, completed_at, timestamps
- `execution_steps` — id, execution_id, node_id, agent_code, agent_version, status (`pending` \| `running` \| `completed` \| `failed` \| `cancelled` \| `retrying`), attempt, input_json, output_json, error_json?, started_at, completed_at, timestamps
- Index: `(workflow_id, created_at)`, `(status)`, `(execution_id, node_id)`

---

### Acceptance Criteria

- Không JWT → 401; thiếu permission → 403 trên mọi execution route
- Start chỉ với Workflow **published**; draft-only → 404/422 theo visibility rules Management
- Execution gắn đúng `workflow_version` snapshot; sửa Workflow sau start **không** đổi execution đang chạy / history
- Nodes chạy theo dependency; parallel khi ready-set > 1; không chạy node khi dependency chưa `completed`
- Cancel dừng nhận work mới; status `cancelled`
- Retry trên `failed` tạo attempt mới cho failed steps; completed steps không chạy lại
- Step history có input/output/status/duration cho observability
- Module `modules/executions` phụ thuộc Auth + Workflows read (published version) + Agents read; **không** import Builder mutation APIs; không CRUD Prompt/Tool
- Empty published graph: Execution completes with zero steps (documented)

---

### Implementation Notes (Engineering)

- Tuân ARCHITECTURE: Configuration-Driven; Workflow Engine ≠ business logic; Agent Independence; Shared Context; Execution History
- Align `docs/engineering/SYSTEM_DESIGN.md` lifecycle + `WORKFLOW_ENGINE.md` snapshot/version pin
- Reuse BullMQ (`QueueModule`); không chạy orchestration đồng bộ trong HTTP request ngoài enqueue
- Repository Pattern; không Active Record; PostgreSQL `jsonb` cho snapshot/context/I/O
- Permissions đã seed — không đổi matrix trừ khi thiếu action
- Agent runner: interface + MVP stub (deterministic echo/fixture) đủ để test engine; optional real LLM sau không block AC engine
- Tách rõ với **Workflow Management/Builder**: Execution chỉ đọc published snapshot; không PUT definition

---

---

# Phase 2 — Fashion Module

Milestone 2 builds the first real business Workflow (Kids Fashion Research & Design) **as configuration** on Platform Foundation — no new platform architecture. Each feature below is a published Workflow (+ Agents / Prompts / Tools as needed) executable via Execution Engine.

---

## Trend Research Workflow

Priority: Critical

Status: Done

Spec: `specs/008-trend-research`

Notes: Done — configuration + Execution `requiredInputs` enforcement + Fashion stub fixtures. Seed: 3 Agents, 3 Prompts, web-search wiring, published Workflow `kids-fashion-trend-research`. Validate via `pnpm migration:run && pnpm seed` then `specs/008-trend-research/quickstart.md`. Unit tests: `pnpm exec jest src/modules/executions/services/required-inputs.spec.ts src/modules/executions/services/stub-agent-runner.service.spec.ts src/modules/executions/services/executions.service.spec.ts` (17 passed). Review: configuration-driven (no fashion NestJS module); generic required-input policy; AC covered.

Dependency

Platform Foundation — ✅ satisfied (Auth, Agent Registry, Workflow Management/Builder, Prompt Library, Tool Library, Execution — all Status Done)

Goal

Ship the first Milestone 2 business Workflow: **Kids Fashion Trend Research** — from design brief input (season, category, market, constraints) produce a structured trend research report with references — using existing Platform APIs only (seed/config data, not a new NestJS domain module).

Workflow is data: published Workflow definition + published Agents + Prompt/Tool refs. Execution uses the existing engine (MVP may keep stub/fixture agent runner when live LLM/tool adapters are not yet wired).

---

### Scope

In scope

- Published Workflow `kids-fashion-trend-research` (unique `code`) with graph covering:
  1. **Research trends** — gather kids-fashion trend signals for given season/category/market
  2. **Collect references** — attach reference sources / inspiration pointers (URLs, titles, notes; not full Reference Image Workflow)
  3. **Generate research report** — synthesize a structured research report into Shared Context
- Agents (published + enabled) for the nodes above — reuse/extend `research-agent` and/or add capability-specific agents (`capability_type`: `research` | `analysis` as needed)
- Prompts (published + enabled) assigned via Agent `promptRef` for research / report steps
- Tools: assign existing published tools where relevant (e.g. `web-search`, optionally `web-browser`); **no** new live SerpAPI/Playwright adapters in this feature
- Documented input schema (execution `input`) and output context keys for downstream Milestone 2 workflows (esp. Reference Image)
- Idempotent seed so `pnpm seed` creates/updates Workflow + Agents + Prompt wiring
- Quickstart: start Execution with sample kids-fashion input → observe steps → read completed context/report
- RBAC unchanged: start via `workflows:execute` / `executions:*` already seeded

Out of scope (Phase sau / feature khác)

- Reference Image Workflow (image search, grouping, inspiration boards) — next Phase 2 feature
- Style Analysis / Design Brief / Image Generation / Design Review workflows
- Real LLM invocation beyond what Execution already supports (if runner is still stub: deterministic structured fixtures that match report schema)
- Real search/browser/image tool adapters (Tool Library catalog only)
- New NestJS modules (`modules/fashion`, `modules/trend-research`) or new REST resource beyond existing Workflow/Agent/Prompt/Tool/Execution APIs
- Marketplace, scheduling, approval gates, multi-tenant isolation
- Hot-edit definition mid-execution

---

### Deliverables

- Seed (or seed refactor): published Workflow `kids-fashion-trend-research` with non-empty validated graph (nodes + edges + I/O mappings)
- Seed: Agents + Prompt(s) + `toolRefs` needed by that graph (idempotent; align existing `research-agent` / `research-brief` / `web-search` where possible)
- Documented execution input example + expected context output shape (in spec `quickstart.md` / contracts notes)
- Unit/integration coverage for seed invariants and/or graph validation (at least: workflow published, agents assignable, execute empty-failure paths documented)
- Spec folder `specs/008-trend-research` (specify → plan → tasks)
- **No** new Phase-1-style domain module unless clarify proves an unavoidable gap (default: configuration-only)

---

### Features

#### Workflow — Kids Fashion Trend Research

- Create/publish Workflow definition (Management + Builder patterns already shipped)
- Nodes (MVP graph — exact codes in spec):
  - Trend research agent step
  - Reference collection step (textual/URL references; not image assets pipeline)
  - Research report synthesis step
- Edges: sequential or fan-in as needed so report runs only after research (+ refs) complete
- Variables/policies: optional defaults (e.g. target market, age band) documented in definition

#### Agents / Prompts / Tools

- Ensure each node has published + enabled Agent with clear `input_schema` / `output_schema`
- Prompt templates for research + report (versioned, published)
- `toolRefs` include `web-search` (and optionally `web-browser`) for research agent(s)
- Soft-deleted / disabled catalog items must not be newly assigned

#### Execution — Demo path

- Start Execution with sample input (e.g. season=`SS27`, category=`kids-apparel`, market=`VN`/`US`)
- Steps complete per dependency; final context holds structured `researchReport` (and intermediate keys)
- Cancel/retry behavior inherits Execution feature — no new engine semantics

---

### API Surface

No new public routes. Consume existing:

| Method | Path | Permission |
|--------|------|------------|
| GET/POST… | `/api/v1/workflows` (+ Builder definition APIs) | `workflows:*` |
| GET/POST… | `/api/v1/agents` · `/api/v1/prompts` · `/api/v1/tools` | respective `*:read` / mutate |
| POST | `/api/v1/workflows/:id/execute` or `POST /api/v1/executions` | `workflows:execute` / `executions:create` |
| GET | `/api/v1/executions/:id` · `.../steps` | `executions:read` |

---

### Data Model (logical — configuration)

- Workflow `kids-fashion-trend-research` + published `workflow_versions.definition_json`
- Agent(s) + `agent_versions` (schemas, `promptRef`, `toolRefs[]`)
- Prompt(s) + versions for research/report templates
- Reuse Tool codes already seeded (`web-search`, …)
- Execution rows created at runtime (existing `executions` / `execution_steps`)

Suggested Shared Context keys (finalize in spec/clarify):

- Input: `season`, `category`, `market`, `ageBand?`, `constraints?`
- Intermediate: `trendFindings`, `references[]`
- Output: `researchReport` `{ summary, trends[], references[], gaps[] }`

---

### Acceptance Criteria

- Platform Foundation deps remain Done; this feature adds **configuration + seed + docs/tests**, not a parallel architecture
- After seed: Workflow `kids-fashion-trend-research` is **published**, graph non-empty, all node Agents **published + enabled**, Prompt/Tool refs valid
- Designer/admin can execute Workflow; Execution reaches `completed` (or documented stub path) with `researchReport` present in context
- Operator/viewer can read Execution history; cannot mutate definition
- No JWT → 401; missing execute permission → 403 (unchanged platform behavior)
- Idempotent seed: re-run does not duplicate active Workflow/Agent/Prompt codes
- Downstream handoff: documented context keys sufficient for **Reference Image Workflow** to consume `researchReport` / `references` later
- No new public fashion-specific REST module unless explicitly approved in clarify

---

### Implementation Notes (Engineering)

- Tuân ARCHITECTURE: Configuration-Driven; Agent Independence; Workflow = data; Kids Fashion is a Module of Workflows, not hard-coded platform logic
- Prefer extending existing seeds (`agents.seed`, `prompts.seed`, `tools.seed`, `workflows.seed`) over new runtime modules
- Align definition shape with `docs/engineering/WORKFLOW_ENGINE.md` and Builder validation rules
- If agent runner remains stub: return fixture JSON matching schemas so Execution AC is demonstrable
- Feature branch / spec folder: `specs/008-trend-research`
- Do **not** implement Reference Image or later Phase 2 workflows in this feature

---

## Reference Image Workflow

Priority: High

Status: Done

Spec: `specs/009-reference-image`

Notes: Done — configuration + Fashion Reference Image stub fixtures. Seed: 3 Agents (`fashion-image-search`, `fashion-reference-grouper`, `fashion-inspiration-organizer`), 3 Prompts, `web-search`+`web-browser` wiring, published Workflow `kids-fashion-reference-image`. Validate via `pnpm migration:run && pnpm seed` then `specs/009-reference-image/quickstart.md`. Unit tests: `pnpm exec jest src/modules/executions/services/required-inputs.spec.ts src/modules/executions/services/stub-agent-runner.service.spec.ts src/modules/executions/services/executions.service.spec.ts` (18 passed).

Dependency

Trend Research Workflow — ✅ satisfied (`kids-fashion-trend-research` Done; handoff context keys `researchReport` / `references` / `trendFindings`)

Goal

Ship the second Milestone 2 business Workflow: **Kids Fashion Reference Image** — from Trend Research outputs (and optional overrides) search for visual references, group them, and produce an organized inspiration set in Shared Context — using existing Platform APIs only (seed/config data, not a new NestJS domain module).

Workflow is data: published Workflow definition + published Agents + Prompt/Tool refs. Execution uses the existing engine (MVP may keep stub/fixture agent runner when live image-search adapters are not yet wired).

---

### Scope

In scope

- Published Workflow `kids-fashion-reference-image` (unique `code`) with graph covering:
  1. **Search images** — find visual reference candidates from trends/report (URLs, titles, thumbnails/metadata; not binary asset storage pipeline)
  2. **Group references** — cluster candidates by theme/style/use (e.g. color, silhouette, print)
  3. **Organize inspiration** — produce a structured inspiration board / reference set into Shared Context for Style Analysis
- Agents (published + enabled) for the three nodes — capability suitable for research/analysis as needed
- Prompts (published + enabled) via Agent `promptRef` for search / group / organize steps
- Tools: assign existing published catalog tools where relevant (e.g. `web-search`, `web-browser`, `object-storage` for metadata pointers); **no** new live image-search/CDN adapters in this feature (catalog + stub fixtures only)
- Documented input schema: accept prior Trend Research context keys and/or direct Execution input (season, category, market, researchReport/references); declare `policies.requiredInputs` as needed
- Idempotent seed so `pnpm seed` creates/updates Workflow + Agents + Prompt wiring
- Quickstart: start after Trend Research sample path (or inject equivalent input) → observe steps → read completed inspiration context
- RBAC unchanged: start via `workflows:execute` / `executions:*` already seeded

Out of scope (Phase sau / feature khác)

- Style Analysis / Design Brief / Image Generation / Design Review workflows
- Real image-search APIs, scraper adapters, or binary image download/hosting pipelines
- Real LLM invocation beyond stub/fixture agent runner
- New NestJS modules (`modules/fashion`, `modules/reference-image`) or new REST resource beyond existing Workflow/Agent/Prompt/Tool/Execution APIs
- Marketplace, scheduling, approval gates, multi-tenant isolation
- Hot-edit definition mid-execution
- Changing Trend Research Workflow AC (consume its outputs only)

---

### Deliverables

- Seed: published Workflow `kids-fashion-reference-image` with non-empty validated graph (nodes + edges + I/O mappings)
- Seed: Agents + Prompt(s) + `toolRefs` needed by that graph (idempotent)
- Documented execution input example + expected context output shape (spec `quickstart.md` / contracts notes)
- Stub fixtures for the three Agents when runner remains stub (deterministic structured JSON matching schemas)
- Unit/integration coverage for seed invariants and/or fixtures as needed
- Spec folder `specs/009-reference-image` (specify → plan → tasks)
- **No** new Phase-1-style domain module unless clarify proves an unavoidable gap (default: configuration-only)

---

### Features

#### Workflow — Kids Fashion Reference Image

- Create/publish Workflow definition (Management + Builder patterns already shipped)
- Nodes (MVP graph — exact codes in spec):
  - Image search agent step
  - Reference grouping step
  - Inspiration organization step
- Edges: sequential or fan-in so organize runs only after search (+ group) complete
- Variables/policies: required inputs documented; consume Trend Research keys when present

#### Agents / Prompts / Tools

- Ensure each node has published + enabled Agent with clear `input_schema` / `output_schema`
- Prompt templates for search + group + organize (versioned, published)
- `toolRefs` as appropriate from existing Tool catalog
- Soft-deleted / disabled catalog items must not be newly assigned

#### Execution — Demo path

- Start Execution with sample input that includes (or implies) Trend Research outputs
- Steps complete per dependency; final context holds structured inspiration set (and intermediate keys)
- Cancel/retry behavior inherits Execution feature — no new engine semantics

---

### API Surface

No new public routes. Consume existing:

| Method | Path | Permission |
|--------|------|------------|
| GET/POST… | `/api/v1/workflows` (+ Builder definition APIs) | `workflows:*` |
| GET/POST… | `/api/v1/agents` · `/api/v1/prompts` · `/api/v1/tools` | respective `*:read` / mutate |
| POST | `/api/v1/workflows/:id/execute` or `POST /api/v1/executions` | `workflows:execute` / `executions:create` |
| GET | `/api/v1/executions/:id` · `.../steps` | `executions:read` |

---

### Data Model (logical — configuration)

- Workflow `kids-fashion-reference-image` + published `workflow_versions.definition_json`
- Agent(s) + `agent_versions` (schemas, `promptRef`, `toolRefs[]`)
- Prompt(s) + versions for search/group/organize templates
- Reuse Tool codes already seeded (`web-search`, `web-browser`, `object-storage`, …)
- Execution rows created at runtime (existing `executions` / `execution_steps`)

Suggested Shared Context keys (finalize in spec/clarify):

- Input (from prior run or direct): `season`, `category`, `market`, `researchReport?`, `references?`, `trendFindings?`
- Intermediate: `imageCandidates[]`, `groupedReferences[]`
- Output: `inspirationBoard` `{ summary, groups[], references[], notes[] }` — sufficient for **Style Analysis Workflow**

---

### Acceptance Criteria

- Trend Research remains Done; this feature adds **configuration + seed + docs/tests**, not a parallel architecture
- After seed: Workflow `kids-fashion-reference-image` is **published**, graph non-empty, all node Agents **published + enabled**, Prompt/Tool refs valid
- Designer/admin can execute Workflow; Execution reaches `completed` (or documented stub path) with `inspirationBoard` present in context
- Operator/viewer can read Execution history; cannot mutate definition
- No JWT → 401; missing execute permission → 403 (unchanged platform behavior)
- Missing declared required inputs → start rejected (generic `policies.requiredInputs` enforcement already shipped)
- Idempotent seed: re-run does not duplicate active Workflow/Agent/Prompt codes
- Downstream handoff: documented context keys sufficient for **Style Analysis Workflow** to consume `inspirationBoard` / grouped references later
- No new public fashion-specific REST module unless explicitly approved in clarify

---

### Implementation Notes (Engineering)

- Tuân ARCHITECTURE: Configuration-Driven; Agent Independence; Workflow = data; Kids Fashion is a Module of Workflows, not hard-coded platform logic
- Prefer extending existing seeds (`agents.seed`, `prompts.seed`, `tools.seed`, `workflows.seed`) over new runtime modules
- Align definition shape with `docs/engineering/WORKFLOW_ENGINE.md` and Builder validation rules
- If agent runner remains stub: return fixture JSON matching schemas so Execution AC is demonstrable
- Feature branch / spec folder: `specs/009-reference-image`
- Do **not** implement Style Analysis or later Phase 2 workflows in this feature

---


## Style Analysis Workflow

Priority: High

Status: Done

Spec: `specs/010-style-analysis`

Notes: Done — configuration + Fashion Style Analysis stub fixtures. Seed: 4 Agents (`fashion-color-analyzer`, `fashion-style-analyzer`, `fashion-pattern-analyzer`, `fashion-illustration-analyzer`), 4 Prompts, `web-browser` wiring on color/style/pattern, published Workflow `kids-fashion-style-analysis`. Validate via `pnpm migration:run && pnpm seed` then `specs/010-style-analysis/quickstart.md`. Unit tests: `pnpm exec jest src/modules/executions/services/required-inputs.spec.ts src/modules/executions/services/stub-agent-runner.service.spec.ts src/modules/executions/services/executions.service.spec.ts` (19 passed).

Dependency

Reference Image Workflow — ✅ satisfied (`kids-fashion-reference-image` Done; handoff context keys `inspirationBoard` / `groupedReferences` / `imageCandidates`)

Goal

Ship the third Milestone 2 business Workflow: **Kids Fashion Style Analysis** — from Reference Image outputs (and optional overrides) analyze color, style, pattern, and illustration signals and produce a structured style analysis report in Shared Context — using existing Platform APIs only (seed/config data, not a new NestJS domain module).

Workflow is data: published Workflow definition + published Agents + Prompt/Tool refs. Execution uses the existing engine (MVP may keep stub/fixture agent runner when live vision/LLM adapters are not yet wired).

---

### Scope

In scope

- Published Workflow `kids-fashion-style-analysis` (unique `code`) with graph covering:
  1. **Color analysis** — extract palette / color direction from inspiration references
  2. **Style analysis** — characterize silhouettes, aesthetics, age-appropriate style cues
  3. **Pattern analysis** — identify print/pattern motifs and usage notes
  4. **Illustration analysis** — synthesize visual/illustration language into the final style report
- Agents (published + enabled) for the four nodes — capability suitable for `analysis` as needed
- Prompts (published + enabled) via Agent `promptRef` for color / style / pattern / illustration steps
- Tools: assign existing published catalog tools where relevant (e.g. `web-browser` for reference URLs); **no** new live vision/CV adapters in this feature (catalog + stub fixtures only)
- Documented input schema: accept prior Reference Image context keys and/or direct Execution input (season, category, market, inspirationBoard/groupedReferences/imageCandidates); declare `policies.requiredInputs` as needed
- Idempotent seed so `pnpm seed` creates/updates Workflow + Agents + Prompt wiring
- Quickstart: start after Reference Image sample path (or inject equivalent input) → observe steps → read completed style analysis context
- RBAC unchanged: start via `workflows:execute` / `executions:*` already seeded

Out of scope (Phase sau / feature khác)

- Design Brief / Image Generation / Design Review workflows
- Real vision/CV APIs, image download pipelines, or binary asset analysis beyond metadata in context
- Real LLM invocation beyond stub/fixture agent runner
- New NestJS modules (`modules/fashion`, `modules/style-analysis`) or new REST resource beyond existing Workflow/Agent/Prompt/Tool/Execution APIs
- Marketplace, scheduling, approval gates, multi-tenant isolation
- Hot-edit definition mid-execution
- Changing Reference Image Workflow AC (consume its outputs only)

---

### Deliverables

- Seed: published Workflow `kids-fashion-style-analysis` with non-empty validated graph (nodes + edges + I/O mappings)
- Seed: Agents + Prompt(s) + `toolRefs` needed by that graph (idempotent)
- Documented execution input example + expected context output shape (spec `quickstart.md` / contracts notes)
- Stub fixtures for the four Agents when runner remains stub (deterministic structured JSON matching schemas)
- Unit/integration coverage for seed invariants and/or fixtures as needed
- Spec folder `specs/010-style-analysis` (specify → plan → tasks)
- **No** new Phase-1-style domain module unless clarify proves an unavoidable gap (default: configuration-only)

---

### Features

#### Workflow — Kids Fashion Style Analysis

- Create/publish Workflow definition (Management + Builder patterns already shipped)
- Nodes (MVP graph — exact codes in spec):
  - Color analysis agent step
  - Style analysis agent step
  - Pattern analysis agent step
  - Illustration analysis / report synthesis agent step
- Edges: sequential or fan-in so the final report step runs only after prerequisites complete
- Variables/policies: required inputs documented; consume Reference Image keys when present

#### Agents / Prompts / Tools

- Ensure each node has published + enabled Agent with clear `input_schema` / `output_schema`
- Prompt templates for color + style + pattern + illustration (versioned, published)
- `toolRefs` as appropriate from existing Tool catalog
- Soft-deleted / disabled catalog items must not be newly assigned

#### Execution — Demo path

- Start Execution with sample input that includes (or implies) Reference Image outputs
- Steps complete per dependency; final context holds structured style analysis report (and intermediate keys)
- Cancel/retry behavior inherits Execution feature — no new engine semantics

---

### API Surface

No new public routes. Consume existing:

| Method | Path | Permission |
|--------|------|------------|
| GET/POST… | `/api/v1/workflows` (+ Builder definition APIs) | `workflows:*` |
| GET/POST… | `/api/v1/agents` · `/api/v1/prompts` · `/api/v1/tools` | respective `*:read` / mutate |
| POST | `/api/v1/workflows/:id/execute` or `POST /api/v1/executions` | `workflows:execute` / `executions:create` |
| GET | `/api/v1/executions/:id` · `.../steps` | `executions:read` |

---

### Data Model (logical — configuration)

- Workflow `kids-fashion-style-analysis` + published `workflow_versions.definition_json`
- Agent(s) + `agent_versions` (schemas, `promptRef`, `toolRefs[]`)
- Prompt(s) + versions for color/style/pattern/illustration templates
- Reuse Tool codes already seeded (`web-browser`, `web-search`, …)
- Execution rows created at runtime (existing `executions` / `execution_steps`)

Suggested Shared Context keys (finalize in spec/clarify):

- Input (from prior run or direct): `season`, `category`, `market`, `inspirationBoard?`, `groupedReferences?`, `imageCandidates?`
- Intermediate: `colorAnalysis`, `styleAnalysis`, `patternAnalysis`
- Output: `styleReport` `{ summary, colors[], styles[], patterns[], illustrationNotes[], recommendations[] }` — sufficient for **Design Brief Workflow**

---

### Acceptance Criteria

- Reference Image remains Done; this feature adds **configuration + seed + docs/tests**, not a parallel architecture
- After seed: Workflow `kids-fashion-style-analysis` is **published**, graph non-empty, all node Agents **published + enabled**, Prompt/Tool refs valid
- Designer/admin can execute Workflow; Execution reaches `completed` (or documented stub path) with `styleReport` present in context
- Operator/viewer can read Execution history; cannot mutate definition
- No JWT → 401; missing execute permission → 403 (unchanged platform behavior)
- Missing declared required inputs → start rejected (generic `policies.requiredInputs` enforcement already shipped)
- Idempotent seed: re-run does not duplicate active Workflow/Agent/Prompt codes
- Downstream handoff: documented context keys sufficient for **Design Brief Workflow** to consume `styleReport` later
- No new public fashion-specific REST module unless explicitly approved in clarify

---

### Implementation Notes (Engineering)

- Tuân ARCHITECTURE: Configuration-Driven; Agent Independence; Workflow = data; Kids Fashion is a Module of Workflows, not hard-coded platform logic
- Prefer extending existing seeds (`agents.seed`, `prompts.seed`, `tools.seed`, `workflows.seed`) over new runtime modules
- Align definition shape with `docs/engineering/WORKFLOW_ENGINE.md` and Builder validation rules
- If agent runner remains stub: return fixture JSON matching schemas so Execution AC is demonstrable
- Feature branch / spec folder: `specs/010-style-analysis`
- Do **not** implement Design Brief or later Phase 2 workflows in this feature

---

## Design Brief Workflow

Priority: High

Status: Done

Spec: `specs/011-design-brief`

Notes: Done — configuration + Fashion Design Brief stub fixtures. Seed: 2 Agents (`fashion-design-brief-writer`, `fashion-design-spec-writer`), 2 Prompts, empty `toolRefs`, published Workflow `kids-fashion-design-brief`. Validate via `pnpm migration:run && pnpm seed` then `specs/011-design-brief/quickstart.md`. Unit tests: `pnpm exec jest src/modules/executions/services/required-inputs.spec.ts src/modules/executions/services/stub-agent-runner.service.spec.ts src/modules/executions/services/executions.service.spec.ts`.

Dependency

Style Analysis Workflow — ✅ satisfied (`kids-fashion-style-analysis` Done; handoff context keys `styleReport` / `colorAnalysis` / `styleAnalysis` / `patternAnalysis`)

Goal

Ship the fourth Milestone 2 business Workflow: **Kids Fashion Design Brief** — from Style Analysis outputs (and optional overrides) generate a design brief and a design specification into Shared Context — using existing Platform APIs only (seed/config data, not a new NestJS domain module).

Workflow is data: published Workflow definition + published Agents + Prompt/Tool refs. Execution uses the existing engine (MVP may keep stub/fixture agent runner when live LLM adapters are not yet wired).

---

### Scope

In scope

- Published Workflow `kids-fashion-design-brief` (unique `code`) with graph covering:
  1. **Generate design brief** — synthesize creative direction / brief narrative from style analysis signals
  2. **Generate design specification** — produce a structured design specification suitable for Image Generation handoff
- Agents (published + enabled) for the two nodes — capability suitable for `analysis` / `generation` as needed
- Prompts (published + enabled) via Agent `promptRef` for brief / specification steps
- Tools: assign existing published catalog tools where relevant; **no** new live LLM/generation adapters in this feature (catalog + stub fixtures only)
- Documented input schema: accept prior Style Analysis context keys and/or direct Execution input (season, category, market, styleReport/colorAnalysis/styleAnalysis/patternAnalysis); declare `policies.requiredInputs` as needed
- Idempotent seed so `pnpm seed` creates/updates Workflow + Agents + Prompt wiring
- Quickstart: start after Style Analysis sample path (or inject equivalent input) → observe steps → read completed design brief / specification context
- RBAC unchanged: start via `workflows:execute` / `executions:*` already seeded

Out of scope (Phase sau / feature khác)

- Image Generation / Design Review workflows
- Real LLM invocation beyond stub/fixture agent runner
- Real image generation / vision adapters
- New NestJS modules (`modules/fashion`, `modules/design-brief`) or new REST resource beyond existing Workflow/Agent/Prompt/Tool/Execution APIs
- Marketplace, scheduling, approval gates, multi-tenant isolation
- Hot-edit definition mid-execution
- Changing Style Analysis Workflow AC (consume its outputs only)

---

### Deliverables

- Seed: published Workflow `kids-fashion-design-brief` with non-empty validated graph (nodes + edges + I/O mappings)
- Seed: Agents + Prompt(s) + `toolRefs` needed by that graph (idempotent)
- Documented execution input example + expected context output shape (spec `quickstart.md` / contracts notes)
- Stub fixtures for the two Agents when runner remains stub (deterministic structured JSON matching schemas)
- Unit/integration coverage for seed invariants and/or fixtures as needed
- Spec folder `specs/011-design-brief` (specify → plan → tasks)
- **No** new Phase-1-style domain module unless clarify proves an unavoidable gap (default: configuration-only)

---

### Features

#### Workflow — Kids Fashion Design Brief

- Create/publish Workflow definition (Management + Builder patterns already shipped)
- Nodes (MVP graph — exact codes in spec):
  - Design brief generation agent step
  - Design specification generation agent step
- Edges: sequential so specification runs only after brief completes
- Variables/policies: required inputs documented; consume Style Analysis keys when present

#### Agents / Prompts / Tools

- Ensure each node has published + enabled Agent with clear `input_schema` / `output_schema`
- Prompt templates for brief + specification (versioned, published)
- `toolRefs` as appropriate from existing Tool catalog
- Soft-deleted / disabled catalog items must not be newly assigned

#### Execution — Demo path

- Start Execution with sample input that includes (or implies) Style Analysis outputs
- Steps complete per dependency; final context holds structured design brief and design specification
- Cancel/retry behavior inherits Execution feature — no new engine semantics

---

### API Surface

No new public routes. Consume existing:

| Method | Path | Permission |
|--------|------|------------|
| GET/POST… | `/api/v1/workflows` (+ Builder definition APIs) | `workflows:*` |
| GET/POST… | `/api/v1/agents` · `/api/v1/prompts` · `/api/v1/tools` | respective `*:read` / mutate |
| POST | `/api/v1/workflows/:id/execute` or `POST /api/v1/executions` | `workflows:execute` / `executions:create` |
| GET | `/api/v1/executions/:id` · `.../steps` | `executions:read` |

---

### Data Model (logical — configuration)

- Workflow `kids-fashion-design-brief` + published `workflow_versions.definition_json`
- Agent(s) + `agent_versions` (schemas, `promptRef`, `toolRefs[]`)
- Prompt(s) + versions for brief/specification templates
- Reuse Tool codes already seeded where relevant
- Execution rows created at runtime (existing `executions` / `execution_steps`)

Suggested Shared Context keys (finalize in spec/clarify):

- Input (from prior run or direct): `season`, `category`, `market`, `styleReport?`, `colorAnalysis?`, `styleAnalysis?`, `patternAnalysis?`
- Intermediate: `designBrief`
- Output: `designSpecification` `{ summary, objectives[], constraints[], colorDirection[], styleDirection[], patternDirection[], deliverables[], notes[] }` — sufficient for **Image Generation Workflow** (or finalize shapes in clarify)

---

### Acceptance Criteria

- Style Analysis remains Done; this feature adds **configuration + seed + docs/tests**, not a parallel architecture
- After seed: Workflow `kids-fashion-design-brief` is **published**, graph non-empty, all node Agents **published + enabled**, Prompt/Tool refs valid
- Designer/admin can execute Workflow; Execution reaches `completed` (or documented stub path) with `designBrief` and `designSpecification` present in context
- Operator/viewer can read Execution history; cannot mutate definition
- No JWT → 401; missing execute permission → 403 (unchanged platform behavior)
- Missing declared required inputs → start rejected (generic `policies.requiredInputs` enforcement already shipped)
- Idempotent seed: re-run does not duplicate active Workflow/Agent/Prompt codes
- Downstream handoff: documented context keys sufficient for **Image Generation Workflow** to consume `designBrief` / `designSpecification` later
- No new public fashion-specific REST module unless explicitly approved in clarify

---

### Implementation Notes (Engineering)

- Tuân ARCHITECTURE: Configuration-Driven; Agent Independence; Workflow = data; Kids Fashion is a Module of Workflows, not hard-coded platform logic
- Prefer extending existing seeds (`agents.seed`, `prompts.seed`, `tools.seed`, `workflows.seed`) over new runtime modules
- Align definition shape with `docs/engineering/WORKFLOW_ENGINE.md` and Builder validation rules
- If agent runner remains stub: return fixture JSON matching schemas so Execution AC is demonstrable
- Feature branch / spec folder: `specs/011-design-brief`
- Do **not** implement Image Generation or later Phase 2 workflows in this feature

---


## Image Generation Workflow

Priority: High

Status: Done

Spec: `specs/012-image-generation`

Notes: Done — configuration + Fashion Image Generation stub fixtures. Seed: 3 Agents (`fashion-image-prompt-prep`, `fashion-image-generator`, `fashion-image-organizer`), 3 Prompts, `image-generation`+`object-storage` wiring, published Workflow `kids-fashion-image-generation`. Validate via `pnpm migration:run && pnpm seed` then `specs/012-image-generation/quickstart.md`. Unit tests: `pnpm exec jest src/modules/executions/services/required-inputs.spec.ts src/modules/executions/services/stub-agent-runner.service.spec.ts src/modules/executions/services/executions.service.spec.ts`.

Dependency

Design Brief Workflow — ✅ satisfied (`kids-fashion-design-brief` Done; handoff context keys `designBrief` / `designSpecification`)

Goal

Ship the fifth Milestone 2 business Workflow: **Kids Fashion Image Generation** — from Design Brief outputs (and optional overrides) prepare generation prompts, produce multiple artwork variations, and organize generated image candidates into Shared Context for Design Review handoff — using existing Platform APIs only (seed/config data, not a new NestJS domain module).

Workflow is data: published Workflow definition + published Agents + Prompt/Tool refs. Execution uses the existing engine (MVP may keep stub/fixture agent runner when live image-generation adapters are not yet wired).

---

### Scope

In scope

- Published Workflow `kids-fashion-image-generation` (unique `code`) with graph covering:
  1. **Prepare generation prompts** — turn `designBrief` / `designSpecification` into prompt(s) suitable for image generation
  2. **Generate artwork variations** — produce multiple candidate artworks (MVP: structured metadata / stub URLs or fixture assets, not live GPU APIs)
  3. **Organize generation outputs** — normalize candidates into a Shared Context payload for Design Review
- Agents (published + enabled) for the three nodes — capability suitable for `generation` / `analysis` as needed
- Prompts (published + enabled) via Agent `promptRef` for prompt-prep / generation / organize steps
- Tools: assign existing published catalog tools (`image-generation` on generator; `object-storage` on organizer); **no** new live image-provider adapters in this feature (catalog + stub fixtures only)
- Documented input schema: accept prior Design Brief context keys and/or direct Execution input (season, category, market, designBrief, designSpecification); declare `policies.requiredInputs` as needed
- Idempotent seed so `pnpm seed` creates/updates Workflow + Agents + Prompt/Tool wiring
- Quickstart: start after Design Brief sample path (or inject equivalent input) → observe steps → read completed generation context
- RBAC unchanged: start via `workflows:execute` / `executions:*` already seeded

Out of scope (Phase sau / feature khác)

- Design Review Workflow
- Real image-provider APIs (DALL·E, Midjourney, Stable Diffusion, etc.), binary asset pipelines, or CDN hosting beyond stub metadata in context
- Real LLM invocation beyond stub/fixture agent runner
- New NestJS modules (`modules/fashion`, `modules/image-generation`) or new REST resource beyond existing Workflow/Agent/Prompt/Tool/Execution APIs
- Marketplace, scheduling, approval gates, multi-tenant isolation
- Hot-edit definition mid-execution
- Changing Design Brief Workflow AC (consume its outputs only)

---

### Deliverables

- Seed: published Workflow `kids-fashion-image-generation` with non-empty validated graph (nodes + edges + I/O mappings)
- Seed: Agents + Prompt(s) + `toolRefs` needed by that graph (idempotent; wire `image-generation` and `object-storage`)
- Documented execution input example + expected context output shape (spec `quickstart.md` / contracts notes)
- Stub fixtures for the three Agents when runner remains stub (deterministic structured JSON matching schemas)
- Unit/integration coverage for seed invariants and/or fixtures as needed
- Spec folder `specs/012-image-generation` (specify → plan → tasks)
- **No** new Phase-1-style domain module unless clarify proves an unavoidable gap (default: configuration-only)

---

### Features

#### Workflow — Kids Fashion Image Generation

- Create/publish Workflow definition (Management + Builder patterns already shipped)
- Nodes (MVP graph — exact codes in spec):
  - Generation prompt preparation agent step
  - Artwork variation generation agent step
  - Output organization / candidate packaging agent step
- Edges: sequential so generation runs only after prompt prep; organize runs only after generation completes
- Variables/policies: required inputs documented; consume Design Brief keys when present

#### Agents / Prompts / Tools

- Ensure each node has published + enabled Agent with clear `input_schema` / `output_schema`
- Prompt templates for prep + generation + organize (versioned, published)
- `toolRefs` include `image-generation` on the generation agent; `object-storage` on organize
- Soft-deleted / disabled catalog items must not be newly assigned

#### Execution — Demo path

- Start Execution with sample input that includes (or implies) Design Brief outputs
- Steps complete per dependency; final context holds structured generated image candidates (and intermediate keys)
- Cancel/retry behavior inherits Execution feature — no new engine semantics

---

### API Surface

No new public routes. Consume existing:

| Method | Path | Permission |
|--------|------|------------|
| GET/POST… | `/api/v1/workflows` (+ Builder definition APIs) | `workflows:*` |
| GET/POST… | `/api/v1/agents` · `/api/v1/prompts` · `/api/v1/tools` | respective `*:read` / mutate |
| POST | `/api/v1/workflows/:id/execute` or `POST /api/v1/executions` | `workflows:execute` / `executions:create` |
| GET | `/api/v1/executions/:id` · `.../steps` | `executions:read` |

---

### Data Model (logical — configuration)

- Workflow `kids-fashion-image-generation` + published `workflow_versions.definition_json`
- Agent(s) + `agent_versions` (schemas, `promptRef`, `toolRefs[]`)
- Prompt(s) + versions for prep/generation/organize templates
- Reuse Tool codes already seeded (`image-generation`, `object-storage`, …)
- Execution rows created at runtime (existing `executions` / `execution_steps`)

Suggested Shared Context keys (finalize in spec/clarify):

- Input (from prior run or direct): `season`, `category`, `market`, `designBrief`, `designSpecification`
- Intermediate: `imageGenPrompts`, `rawGenerations[]`
- Output: `generatedImages` `{ summary, variations[] }` where each variation has at least `{ id, label, promptRef?, assetUrl?, notes? }` — sufficient for **Design Review Workflow** (or finalize shapes in clarify). Align with engine example key `generated_images` via documented camelCase `generatedImages` unless clarify chooses otherwise.

---

### Acceptance Criteria

- Design Brief remains Done; this feature adds **configuration + seed + docs/tests**, not a parallel architecture
- After seed: Workflow `kids-fashion-image-generation` is **published**, graph non-empty, all node Agents **published + enabled**, Prompt/Tool refs valid
- Designer/admin can execute Workflow; Execution reaches `completed` (or documented stub path) with `generatedImages` (and documented intermediates) present in context
- Operator/viewer can read Execution history; cannot mutate definition
- No JWT → 401; missing execute permission → 403 (unchanged platform behavior)
- Missing declared required inputs → start rejected (generic `policies.requiredInputs` enforcement already shipped)
- Idempotent seed: re-run does not duplicate active Workflow/Agent/Prompt codes
- Downstream handoff: documented context keys sufficient for **Design Review Workflow** to consume `generatedImages` later
- Multiple variations: generation step produces **at least 2** candidate variations in the stub/demo path
- No new public fashion-specific REST module unless explicitly approved in clarify

---

### Implementation Notes (Engineering)

- Tuân ARCHITECTURE: Configuration-Driven; Agent Independence; Workflow = data; Kids Fashion is a Module of Workflows, not hard-coded platform logic
- Prefer extending existing seeds (`agents.seed`, `prompts.seed`, `tools.seed`, `workflows.seed`) over new runtime modules
- Align definition shape with `docs/engineering/WORKFLOW_ENGINE.md` and Builder validation rules
- If agent runner remains stub: return fixture JSON matching schemas so Execution AC is demonstrable
- Feature branch / spec folder: `specs/012-image-generation`
- Do **not** implement Design Review or later Phase 2 workflows in this feature

---

## Design Review Workflow

Priority: High

Status: Done

Spec: `specs/013-design-review`

Notes: Done — configuration + Fashion Design Review stub fixtures. Seed: 3 Agents (`fashion-quality-reviewer`, `fashion-improvement-suggester`, `fashion-design-scorer`), 3 Prompts, `object-storage` wiring on scorer, published Workflow `kids-fashion-design-review`. Validate via `pnpm migration:run && pnpm seed` then `specs/013-design-review/quickstart.md`. Unit tests: `pnpm exec jest src/modules/executions/services/required-inputs.spec.ts src/modules/executions/services/stub-agent-runner.service.spec.ts src/modules/executions/services/executions.service.spec.ts`.

Dependency

Image Generation Workflow — ✅ satisfied (`kids-fashion-image-generation` Done; handoff context key `generatedImages`)

Goal

Ship the sixth (final) Milestone 2 business Workflow: **Kids Fashion Design Review** — from Image Generation outputs (and optional overrides) review artwork quality, produce improvement suggestions, and assign a final score into Shared Context — using existing Platform APIs only (seed/config data, not a new NestJS domain module).

Workflow is data: published Workflow definition + published Agents + Prompt/Tool refs. Execution uses the existing engine (MVP may keep stub/fixture agent runner when live LLM/vision adapters are not yet wired).

---

### Scope

In scope

- Published Workflow `kids-fashion-design-review` (unique `code`) with graph covering:
  1. **Review quality** — evaluate generated image candidates against brief/design intent
  2. **Improvement suggestions** — produce concrete revision recommendations per variation and/or overall
  3. **Final score** — assign an overall score (and optional per-variation scores) into Shared Context
- Agents (published + enabled) for the three nodes — capability suitable for `analysis` / `review` as needed
- Prompts (published + enabled) via Agent `promptRef` for quality-review / suggestions / scoring steps
- Tools: assign existing published catalog tools where relevant (e.g. `object-storage` on packaging/review node if artifacts are referenced); **no** new live vision/LLM adapters in this feature (catalog + stub fixtures only)
- Documented input schema: accept prior Image Generation context keys and/or direct Execution input (season, category, market, generatedImages, and optionally designBrief / designSpecification); declare `policies.requiredInputs` as needed
- Idempotent seed so `pnpm seed` creates/updates Workflow + Agents + Prompt/Tool wiring
- Quickstart: start after Image Generation sample path (or inject equivalent input) → observe steps → read completed review context
- RBAC unchanged: start via `workflows:execute` / `executions:*` already seeded

Out of scope (Phase sau / feature khác)

- Phase 3 business modules (Blog, Email, Translation, etc.)
- Human-in-the-loop approval gates / UI review boards
- Real LLM or vision-model invocation beyond stub/fixture agent runner
- Real image binary download/CDN validation beyond stub metadata in context
- New NestJS modules (`modules/fashion`, `modules/design-review`) or new REST resource beyond existing Workflow/Agent/Prompt/Tool/Execution APIs
- Marketplace, scheduling, multi-tenant isolation
- Hot-edit definition mid-execution
- Changing Image Generation Workflow AC (consume its outputs only)

---

### Deliverables

- Seed: published Workflow `kids-fashion-design-review` with non-empty validated graph (nodes + edges + I/O mappings)
- Seed: Agents + Prompt(s) + `toolRefs` needed by that graph (idempotent; reuse catalog tools as needed)
- Documented execution input example + expected context output shape (spec `quickstart.md` / contracts notes)
- Stub fixtures for the three Agents when runner remains stub (deterministic structured JSON matching schemas)
- Unit/integration coverage for seed invariants and/or fixtures as needed
- Spec folder `specs/013-design-review` (specify → plan → tasks)
- **No** new Phase-1-style domain module unless clarify proves an unavoidable gap (default: configuration-only)

---

### Features

#### Workflow — Kids Fashion Design Review

- Create/publish Workflow definition (Management + Builder patterns already shipped)
- Nodes (MVP graph — exact codes in spec):
  - Quality review agent step
  - Improvement suggestions agent step
  - Final score agent step
- Edges: sequential so suggestions run only after quality review; scoring runs only after suggestions complete
- Variables/policies: required inputs documented; consume `generatedImages` when present

#### Agents / Prompts / Tools

- Ensure each node has published + enabled Agent with clear `input_schema` / `output_schema`
- Prompt templates for quality review + suggestions + scoring (versioned, published)
- `toolRefs` as appropriate from existing Tool catalog (prefer reuse; no new tool types required for MVP)
- Soft-deleted / disabled catalog items must not be newly assigned

#### Execution — Demo path

- Start Execution with sample input that includes (or implies) Image Generation outputs (`generatedImages` with ≥2 variations)
- Steps complete per dependency; final context holds quality review, suggestions, and final score artifacts
- Cancel/retry behavior inherits Execution feature — no new engine semantics

---

### API Surface

No new public routes. Consume existing:

| Method | Path | Permission |
|--------|------|------------|
| GET/POST… | `/api/v1/workflows` (+ Builder definition APIs) | `workflows:*` |
| GET/POST… | `/api/v1/agents` · `/api/v1/prompts` · `/api/v1/tools` | respective `*:read` / mutate |
| POST | `/api/v1/workflows/:id/execute` or `POST /api/v1/executions` | `workflows:execute` / `executions:create` |
| GET | `/api/v1/executions/:id` · `.../steps` | `executions:read` |

---

### Data Model (logical — configuration)

- Workflow `kids-fashion-design-review` + published `workflow_versions.definition_json`
- Agent(s) + `agent_versions` (schemas, `promptRef`, `toolRefs[]`)
- Prompt(s) + versions for quality/suggestions/score templates
- Reuse Tool codes already seeded where relevant
- Execution rows created at runtime (existing `executions` / `execution_steps`)

Suggested Shared Context keys (finalize in spec/clarify):

- Input (from prior run or direct): `season`, `category`, `market`, `generatedImages` (required), optional `designBrief` / `designSpecification`
- Intermediate: `qualityReview`, `improvementSuggestions`
- Output: `designReviewScore` `{ summary, overallScore, perVariation?[], criteria?[], notes?[] }` — closes Milestone 2 Kids Fashion chain (or finalize shapes in clarify)

---

### Acceptance Criteria

- Image Generation remains Done; this feature adds **configuration + seed + docs/tests**, not a parallel architecture
- After seed: Workflow `kids-fashion-design-review` is **published**, graph non-empty, all node Agents **published + enabled**, Prompt/Tool refs valid
- Designer/admin can execute Workflow; Execution reaches `completed` (or documented stub path) with `qualityReview`, `improvementSuggestions`, and `designReviewScore` present in context
- Operator/viewer can read Execution history; cannot mutate definition
- No JWT → 401; missing execute permission → 403 (unchanged platform behavior)
- Missing declared required inputs → start rejected (generic `policies.requiredInputs` enforcement already shipped)
- Idempotent seed: re-run does not duplicate active Workflow/Agent/Prompt codes
- Review path evaluates **at least 2** image variations when present in `generatedImages` (stub/demo)
- No new public fashion-specific REST module unless explicitly approved in clarify

---

### Implementation Notes (Engineering)

- Tuân ARCHITECTURE: Configuration-Driven; Agent Independence; Workflow = data; Kids Fashion is a Module of Workflows, not hard-coded platform logic
- Prefer extending existing seeds (`agents.seed`, `prompts.seed`, `tools.seed`, `workflows.seed`) over new runtime modules
- Align definition shape with `docs/engineering/WORKFLOW_ENGINE.md` and Builder validation rules
- If agent runner remains stub: return fixture JSON matching schemas so Execution AC is demonstrable
- Feature branch / spec folder: `specs/013-design-review`
- Do **not** implement Phase 3 workflows in this feature

---

# Phase 2.5 — Live Execution (Kids Fashion chạy thật)

Milestone 2 workflows (008–013) are **Done as configuration + stub fixtures**. Phase 2.5 upgrades the Platform runtime so those same published Kids Fashion Workflows can run **with a real local LLM (Ollama)** and, next, **real tool adapters** — without changing Workflow definitions or adding fashion-specific NestJS modules.

Principles

- Configuration-Driven; Agent Independence; Workflow = data
- No new public REST resources beyond existing Workflow / Agent / Prompt / Tool / Execution APIs
- Kids Fashion catalog codes stay as-is; only Execution runtime beneath them changes
- Stub runner remains available (env switch) so CI and demos do not require Ollama

---

## LLM Agent Runner (Ollama)

Priority: Critical

Status: Done

Spec: `specs/014-llm-agent-runner`

Notes: Implemented 2026-07-16 — pluggable `LlmChatProvider` (Ollama live; OpenAI/Gemini stubs), `AGENT_RUNNER=stub|ollama|openai|gemini`, seed harden 008–013. Next Phase 2.5: Tool Runtime Adapters (`015`).

Dependency

Workflow Execution — ✅ satisfied (Status Done; stub `AgentRunner` + orchestrator + BullMQ) · Prompt Library — ✅ satisfied (Status Done; published templates + `modelHints`) · Kids Fashion Workflows (008–013) — ✅ satisfied (all Status Done; stub fixtures)

Goal

Replace the MVP **stub-only** agent invoke path with a pluggable **LLM Agent Runner** that calls **Ollama local** so the six published Kids Fashion Workflows produce real model outputs (structured JSON into Shared Context) when enabled — while keeping stub as the default for CI/tests.

Does **not** implement tool calling (that is the next feature). Does **not** add Gemini/Claude/OpenAI providers in this feature (provider interface may be left open for later).

---

### Scope

In scope

- DI: introduce injection token for `AgentRunner`; `ExecutionOrchestratorService` depends on the **interface**, not concrete `StubAgentRunnerService`
- Env switch: `AGENT_RUNNER=stub|ollama` — **default `stub`** so existing unit tests and seed demos keep working without Ollama
- Ollama runner implementation:
  - Resolve agent version by `(agentCode, agentVersion)` pinned on the Execution step
  - Load published Prompt via Agent `promptRef` (Prompt `code`) → `template` and/or `messages` + `modelHints`
  - Render `{{var}}` placeholders from step mapped `input` (aligned with Prompt `variablesSchema`)
  - Call Ollama HTTP API (`/api/chat` or `/api/generate`) with model + temperature/timeout from config / `modelHints` / agent `configJson`
  - Parse model response as JSON; validate against Agent version `outputSchema`; return object for existing output mapping into Shared Context
- Config: add validated env (`OLLAMA_BASE_URL`, `OLLAMA_MODEL`, optional timeout) via existing Joi + config loader pattern; document in `.env.example`
- HTTP: native `fetch` (or minimal shared client) — no requirement to add axios unless clarify chooses otherwise
- Errors (timeout, non-JSON, schema validation fail, Ollama unreachable) MUST throw so existing step retry / fail semantics apply (`timeoutMs`, `maxRetries` from agent version / node)
- Seed hardening (idempotent): tighten fashion Agents’ `outputSchema` to match documented Shared Context shapes from specs 008–013; ensure Prompts instruct JSON-only responses compatible with those schemas
- Quickstart: run Ollama locally → set `AGENT_RUNNER=ollama` → execute `kids-fashion-trend-research` (minimum demo path) → observe real context keys
- Unit tests with mocked Ollama HTTP; stub path regression tests remain green

Out of scope (Phase sau / feature khác)

- Tool Runtime Adapters / tool calling / function calling (next Phase 2.5 feature)
- Cloud providers: Gemini, Claude, OpenAI, Azure, etc. (interface-only allowance; no adapters in this feature)
- Streaming responses, SSE, chat UI
- New public LLM admin APIs or NestJS `modules/llm` as a business domain
- Changing Kids Fashion Workflow graph topology or codes
- Real image binary / vision multimodal beyond what Ollama text chat returns as JSON metadata
- Phase 3 business modules

---

### Deliverables

- `AgentRunner` DI token + factory/provider selecting stub vs Ollama from env (default stub)
- `OllamaAgentRunnerService` (or equivalent) implementing `AgentRunner`
- Prompt resolve + `{{var}}` renderer used by the Ollama runner
- Env validation + `.env.example` entries for Ollama
- Seed updates: stricter fashion `outputSchema` (+ prompt JSON instructions as needed)
- Spec folder `specs/014-llm-agent-runner` (specify → plan → tasks)
- Quickstart documenting local Ollama model pull + env + first Kids Fashion execution
- Unit tests: stub unchanged; Ollama runner mocked HTTP (success + parse/timeout failures)

---

### Features

#### Runner selection

- `AGENT_RUNNER=stub` → current deterministic fixtures (fashion + generic stub)
- `AGENT_RUNNER=ollama` → live Ollama invoke path
- Invalid value → fail fast at bootstrap (Config validation)

#### Prompt resolution & render

- `promptRef` → published enabled Prompt by code; missing/disabled → clear step error
- Support `template` string and optional `messages[]` if present
- Interpolate variables from mapped step input; missing required vars → clear error (or documented default policy in clarify)

#### Ollama invoke

- Base URL + default model from env; optional per-agent override via `configJson` / `modelHints` (finalize in clarify)
- Respect agent/node timeout; cancel-friendly where practical without blocking orchestrator cancel semantics

#### Output contract

- Model MUST return JSON object suitable for existing `applyOutputMapping`
- Validate against `outputSchema` when schema is non-trivial; on failure retry/fail per existing engine rules

#### Kids Fashion demo path

- Primary AC path: `kids-fashion-trend-research` with Ollama
- Secondary (documented, may be manual): other 008–013 workflows still runnable under Ollama once schemas/prompts are tightened

---

### API Surface

No new public routes. Consume existing Execution / Agent / Prompt surfaces only.

| Method | Path | Permission |
|--------|------|------------|
| POST | `/api/v1/workflows/:id/execute` or `POST /api/v1/executions` | `workflows:execute` / `executions:create` |
| GET | `/api/v1/executions/:id` · `.../steps` | `executions:read` |
| GET | `/api/v1/agents` · `/api/v1/prompts` | respective `*:read` |

Runtime config via environment variables only (not a new REST config API).

---

### Data Model (logical — runtime / config)

- Reuse: `agent_versions` (`promptRef`, `config_json`, `input_schema`, `output_schema`, `timeout_ms`, `max_retries`)
- Reuse: `prompt_versions` (`template`, `messages`, `variables_schema`, `model_hints`)
- Reuse: Execution step pins (`agentCode`, `agentVersion`) + Shared Context
- New env (names finalize in plan): `AGENT_RUNNER`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, optional `OLLAMA_TIMEOUT_MS`

Suggested invoke payload shape (finalize in spec):

- System/user content from rendered Prompt
- User/context variables from mapped input (`season`, `category`, `market`, …)

---

### Acceptance Criteria

- With `AGENT_RUNNER=stub` (default): all existing Execution / stub-fixture unit tests pass; Kids Fashion seed demos behave as today
- With Ollama running locally and `AGENT_RUNNER=ollama`: starting published `kids-fashion-trend-research` with valid required inputs reaches `completed` and Shared Context contains non-fixture `researchReport` (and intermediate keys per Workflow mapping) produced by the model
- Missing Prompt / bad `promptRef` / Ollama down / non-JSON response → step fails (or retries then fails) with a clear error on the Execution/step; no silent empty success
- Bootstrap rejects invalid `AGENT_RUNNER` values
- No new public fashion/LLM REST module
- Idempotent seed still does not duplicate Workflow/Agent/Prompt codes after schema/prompt updates
- Orchestrator no longer hard-depends on concrete `StubAgentRunnerService` type for invoke

---

### Implementation Notes (Engineering)

- Tuân ARCHITECTURE: Configuration-Driven; Agent Independence; runtime adapters live under Execution (or thin infrastructure), not under a fashion module
- Prefer extending `src/modules/executions` + config loaders; inject Prompt read access via existing Prompts module exports
- Today orchestrator does not pass `promptRef` into `invoke` — runner MUST load agent version + prompt itself (or extend `AgentRunnerInvokeInput` in clarify/plan if cleaner)
- Keep stub fixtures for CI; do not delete fashion fixture paths
- Feature branch / spec folder: `specs/014-llm-agent-runner`
- Do **not** implement Tool Runtime Adapters in this feature

---

## Tool Runtime Adapters

Priority: High

Status: Done

Spec: `specs/015-tool-runtime-adapters`

Notes: Implemented 2026-07-16 — ToolInvoker + free/local adapters (DDG search, native-fetch browser, stub-live image, filesystem storage); pre-step enrichment in LlmAgentRunner; TOOL_RUNTIME=stub|live; commented future Google CSE / Browserless / Flux / AWS S3. Follow-on Done: Structured LLM Output (Ollama schema `format`).

Dependency

**LLM Agent Runner (Ollama)** — must be Done first · Tool Library — ✅ satisfied (Status Done; catalog + `toolRefs`) · Kids Fashion Workflows — ✅ satisfied (Agents already wired to `web-search` / `web-browser` / `image-generation` / `object-storage` where relevant)

Goal

Make Tool Library entries **invokable at Execution time** (starting with search/browser for Kids Fashion research/image paths) so Agents with `toolRefs` receive real tool results while running under the Ollama (or stub) agent runner — without inventing fashion-specific tool modules.

---

### Scope

In scope

- Port `ToolInvoker` (or equivalent) + registry keyed by `toolType` and/or Tool `code`
- Resolve tool version config from `tool_versions.config_json`; secrets via env mapped by `secret_ref` (no secrets in DB plaintext)
- MVP adapters prioritized for local/free testability:
  - `web-search` — live or local-friendly search adapter (provider chosen in clarify; must not require paid cloud as the only option)
  - `web-browser` — fetch/extract page text (constrained; no full scraping farm)
  - `image-generation` / `object-storage` — local or stub-live adapters acceptable for MVP if true providers are heavy (document clearly)
- Integration strategy with Agent runner (finalize in clarify): either **pre-step enrichment** (runner invokes declared `toolRefs` then injects results into prompt/input) or **Ollama tool/function calling** loop — pick one primary MVP path
- Failure: tool timeout/error surfaces as agent step failure and participates in existing retry semantics
- Config flags to disable live adapters and fall back to no-op/stub tool results for CI
- Seed: update tool `config_json` from `{ provider: 'stub' }` to documented live/local provider config shapes (still idempotent)
- Quickstart: Ollama + at least `web-search` live path on an Agent that already has `toolRefs` (e.g. trend research)
- Unit tests with mocked adapter HTTP; integration optional behind env

Out of scope (Phase sau / feature khác)

- Mandatory paid providers (SerpAPI / commercial image APIs) as the only supported path
- Full CDN / S3 production object storage productization
- CMS publish, scheduling, marketplace
- New public Tool-execute REST endpoint for end users (runtime is internal to Execution)
- Rewriting Kids Fashion Workflow definitions solely to showcase tools
- Phase 3 modules; additional LLM cloud providers (unless needed only as tool hosts — out of scope)

---

### Deliverables

- `ToolInvoker` port + registry + at least `web-search` and `web-browser` adapters (MVP)
- Wiring from Agent runner (Card 1) to invoke tools per chosen integration strategy
- Env/config for adapter enablement + secrets; `.env.example` updates
- Seed updates for tool config shapes
- Spec folder `specs/015-tool-runtime-adapters` (specify → plan → tasks)
- Quickstart: live tool path on a Kids Fashion Execution
- Unit tests for invoker + adapters (mocked)

---

### Features

#### Tool resolve & invoke

- Given Agent version `toolRefs[]`, resolve each published enabled Tool + current/pinned version config
- Invoke adapter with mapped input; enforce tool `timeout_ms` / `max_retries` where applicable
- Soft-deleted / disabled tools MUST NOT be invoked; clear error if referenced

#### Adapter registry

- Register adapters for seeded codes/types used by Kids Fashion
- Unknown `toolType` → explicit unsupported error (not silent skip)

#### Agent integration

- Primary MVP path chosen in clarify (enrichment vs function-calling)
- Tool results available to the model/prompt so Shared Context outputs can reflect real external data

#### Ops / safety

- Timeouts, size limits on fetched content, no credential logging
- Feature flag / env to force stub/no-op tools in CI

---

### API Surface

No new public routes required for MVP. Internal Execution runtime only.

| Surface | Notes |
|---------|--------|
| Existing Execution APIs | Start/observe Kids Fashion runs |
| Existing Tools CRUD | Catalog remains source of config/schema |
| Env vars | Adapter URLs, API keys via `secret_ref`, enable flags |

---

### Data Model (logical — runtime / config)

- Reuse: `tools` / `tool_versions` (`tool_type`, `config_json`, `input_schema`, `output_schema`, `secret_ref`, `timeout_ms`, `max_retries`)
- Reuse: Agent `toolRefs[]` on `agent_versions`
- Adapter-specific env secrets (names in plan) referenced by `secret_ref`

---

### Acceptance Criteria

- LLM Agent Runner feature remains Done; this feature adds tool runtime only
- With live adapters enabled: an Execution of a Kids Fashion Workflow whose Agent has `toolRefs` including `web-search` shows evidence of real search results influencing the step (prompt enrichment or tool-call trace documented in quickstart / step metadata as decided in clarify)
- Tool failure → step fails or retries then fails; Execution error is observable
- CI path with adapters disabled (or stub tools) does not require external network
- Disabled/soft-deleted Tool codes referenced by an Agent → clear failure, no invoke
- No new public “execute tool” API; no fashion-specific NestJS module
- Idempotent seed after config updates

---

### Implementation Notes (Engineering)

- Tuân ARCHITECTURE: tools are capabilities resolved by code; adapters are infrastructure behind Tool Library metadata
- Depends on Card 1 DI/`AgentRunner` being pluggable
- Prefer local/free adapters for first vertical slice; document paid provider hooks as optional later
- Feature branch / spec folder: `specs/015-tool-runtime-adapters`
- Do **not** start Phase 3 while Phase 2.5 is the active product focus

---

## Structured LLM Output (Ollama schema format)

Priority: High

Status: Done

Spec: _(inline Phase 2.5 — no Speckit folder; follows 014/015)_

Notes: Implemented 2026-07-16 — `LlmChatRequest.responseSchema` + Ollama `format: <Agent outputSchema>` (falls back to `format: "json"` when schema trivial). Pre-step tool enrichment unchanged. Parser coerce kept as thin safety net; tool/function-calling **loop** is a separate future card.

Dependency

**LLM Agent Runner (Ollama)** — ✅ Done · **Tool Runtime Adapters** — ✅ Done · Agent `outputSchema` on published versions — ✅ satisfied

Goal

Constrain live Ollama responses to each Agent’s `outputSchema` so Kids Fashion steps stop failing on near-miss JSON shapes (flat envelopes, wrong keys, null vs string), without replacing pre-step tool enrichment.

---

### Scope

In scope

- Pass non-trivial Agent `outputSchema` into chat provider as structured-output schema
- Ollama: `format: <json-schema object>` instead of bare `"json"` when schema present
- Keep validate + URL sanitize; keep light coerce (null→empty, envelope wrap, inspirationBoard normalize)
- Unit tests for provider body + runner wiring

Out of scope

- Model-driven **tool/function-calling loop** (model chooses web-search/browser mid-chat) — separate future card
- Replacing ToolInvoker pre-step enrichment from 015
- Implementing OpenAI/Gemini structured-output adapters (type accepts `responseSchema` only)
- Full Speckit folder unless product re-opens a numbered feature later

Acceptance Criteria

- With `AGENT_RUNNER=ollama`, chat requests for Agents with non-trivial `outputSchema` send that schema as Ollama `format`
- Trivial/missing schema still uses `format: "json"`
- Reference Image / Trend Research live paths still complete under existing enrichment
- No new public API; stub runner unchanged

---

### Implementation Notes (Engineering)

- Files: `llm-chat.provider.ts`, `ollama-chat.provider.ts`, `llm-agent-runner.service.ts`, thin docs on `json-output.parser.ts`
- Structured output quality still depends on model; prefer stronger instruct models if `llama3.2` drifts
- Future card: **LLM Tool-Calling Loop** (optional replacement/supplement to pre-step enrichment)

---

# Phase 3 — Business Modules

> **Parked (do not start).** Product focus is **Kids Fashion (Milestone 2 + Phase 2.5 Live Execution)** for now. Do not pick Blog Generation or other Phase 3 features until product re-opens Milestone 3.

Blog Generation

Email Automation

Product Description

Translation

Knowledge Assistant

Marketing Content

Customer Support

---

# Future

Workflow Marketplace

Workflow Templates

Shared Agent Library

Shared Prompt Library

Approval Workflow

Schedule Workflow

Notification

Analytics

Collaboration

SSO / OAuth2

Multi-tenant Organizations

MFA
