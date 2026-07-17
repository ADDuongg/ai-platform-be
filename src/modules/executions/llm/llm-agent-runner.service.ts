import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AllConfigType } from '@common/config';
import { AgentsRepository } from '@modules/agents/repositories/agents.repository';
import { AgentVersionsRepository } from '@modules/agents/repositories/agent-versions.repository';
import { AgentStatus, AgentVersionStatus } from '@modules/agents/enums';
import { PromptsService } from '@modules/prompts/services/prompts.service';

import {
  DEFAULT_LLM_TIMEOUT_MS,
  DEFAULT_OLLAMA_MODEL,
  LLM_CHAT_PROVIDER,
  MAX_LLM_RESPONSE_BYTES,
} from '../constants/executions.constants';
import type { AgentRunner, AgentRunnerInvokeInput } from '../services/agent-runner.types';
import {
  assertResponseSize,
  coerceOutputAgainstSchema,
  isNonTrivialSchema,
  parseModelJsonObject,
  validateAgainstOutputSchema,
} from '../services/json-output.parser';
import { ToolInvokerService } from '../tools/tool-invoker.service';
import type { ToolEnrichmentBundle } from '../tools/tool-adapter';
import {
  collectAllowedUrlsFromEnrichment,
  sanitizeReferencesAgainstAllowlist,
} from '../tools/reference-url.sanitizer';
import type { LlmChatProvider } from './llm-chat.provider';

type ChatMessage = { role: string; content: string };

@Injectable()
export class LlmAgentRunnerService implements AgentRunner {
  private readonly logger = new Logger(LlmAgentRunnerService.name);

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly agentsRepository: AgentsRepository,
    private readonly agentVersionsRepository: AgentVersionsRepository,
    private readonly promptsService: PromptsService,
    @Inject(LLM_CHAT_PROVIDER) private readonly chatProvider: LlmChatProvider,
    @Optional() private readonly toolInvoker?: ToolInvokerService,
  ) {}

  async invoke(params: AgentRunnerInvokeInput): Promise<Record<string, unknown>> {
    const agent = await this.agentsRepository.findByCode(params.agentCode.trim().toLowerCase());
    const agentAvailable =
      agent && agent.deletedAt == null && agent.status === AgentStatus.PUBLISHED && agent.enabled;
    if (!agentAvailable) {
      throw new Error(
        `Agent ${params.agentCode} is not available for live invoke (published+enabled required)`,
      );
    }

    const agentVersion = await this.agentVersionsRepository.findByAgentAndVersion(
      agent.id,
      params.agentVersion,
    );
    if (!agentVersion || agentVersion.status !== AgentVersionStatus.PUBLISHED) {
      throw new Error(`Agent ${params.agentCode} version ${params.agentVersion} is not published`);
    }

    const promptRef = agentVersion.promptRef?.trim();
    if (!promptRef) {
      throw new Error(
        `Agent ${params.agentCode} v${params.agentVersion} has no promptRef (required for live LLM runner)`,
      );
    }

    const { version: promptVersion } = await this.promptsService.resolvePublishedByCode(promptRef);
    const variablesSchema = promptVersion.variablesSchema ?? {};
    const promptMessages = buildPromptMessages(
      promptVersion,
      params.input,
      variablesSchema,
      promptRef,
    );

    const { messages, enrichmentBundle } = await this.maybeEnrichWithTools(
      promptMessages,
      agentVersion.toolRefs ?? [],
      params,
    );

    const runnerCfg = this.configService.get('agentRunner', { infer: true });
    const model = this.resolveModel(
      agentVersion.configJson,
      promptVersion.modelHints,
      runnerCfg?.defaultModel,
    );
    const timeoutMs = this.resolveTimeoutMs(
      agentVersion.timeoutMs,
      params.config,
      runnerCfg?.timeoutMs,
    );

    this.logger.log(
      `LLM invoke provider=${this.chatProvider.id} agent=${params.agentCode} v${params.agentVersion} model=${model} timeoutMs=${timeoutMs}`,
    );
    this.logger.log(`LLM rendered prompt:\n${JSON.stringify(messages, null, 2)}`);

    const responseSchema = isNonTrivialSchema(agentVersion.outputSchema)
      ? agentVersion.outputSchema
      : undefined;
    if (responseSchema) {
      this.logger.debug(
        `LLM structured output schema keys=${Object.keys(responseSchema.properties ?? {}).join(',') || '(root)'}`,
      );
    }

    const rawContent = await this.chatProvider.chat({
      model,
      messages,
      timeoutMs,
      temperature: this.resolveTemperature(agentVersion.configJson, promptVersion.modelHints),
      jsonMode: true,
      responseSchema,
    });

    this.logger.log(`LLM raw response (${this.chatProvider.id}):\n${rawContent}`);

    assertResponseSize(rawContent, MAX_LLM_RESPONSE_BYTES);
    const parsed = parseModelJsonObject(rawContent);
    let output = coerceOutputAgainstSchema(parsed, agentVersion.outputSchema);

    const allowedReferenceUrls = new Set([
      ...collectAllowedUrlsFromEnrichment(enrichmentBundle),
      ...collectAllowedUrlsFromEnrichment({
        tools: [{ code: 'context-input', result: params.input }],
      }),
    ]);
    output = sanitizeReferencesAgainstAllowlist(output, allowedReferenceUrls);
    this.logger.log(
      `Reference URL sanitize: allowed=${allowedReferenceUrls.size} (hallucinated URLs dropped)`,
    );

    validateAgainstOutputSchema(output, agentVersion.outputSchema);
    return output;
  }

  private async maybeEnrichWithTools(
    messages: ChatMessage[],
    toolRefs: string[],
    params: AgentRunnerInvokeInput,
  ): Promise<{ messages: ChatMessage[]; enrichmentBundle: ToolEnrichmentBundle | null }> {
    const toolCfg = this.configService.get('toolRuntime', { infer: true });
    const toolMode = (toolCfg?.mode ?? 'stub').toLowerCase();
    if (toolMode !== 'live' || !this.toolInvoker || toolRefs.length === 0) {
      return { messages, enrichmentBundle: null };
    }

    const enrichmentBundle = await this.toolInvoker.invokeAll(toolRefs, params.input, {
      agentCode: params.agentCode,
    });

    const enrichmentJson = JSON.stringify(enrichmentBundle, null, 2);
    this.logger.log(
      `Tool enrichment codes=[${enrichmentBundle.tools.map((t) => t.code).join(', ')}]\n${enrichmentJson}`,
    );

    return {
      messages: [...messages, buildToolEnrichmentMessage(enrichmentJson)],
      enrichmentBundle,
    };
  }

  private resolveModel(
    configJson: Record<string, unknown>,
    modelHints: Record<string, unknown>,
    envModel?: string,
  ): string {
    return (
      firstTrimmedString(configJson?.model, modelHints?.model, envModel) ?? DEFAULT_OLLAMA_MODEL
    );
  }

  private resolveTemperature(
    configJson: Record<string, unknown>,
    modelHints: Record<string, unknown>,
  ): number | undefined {
    return firstNumber(configJson?.temperature, modelHints?.temperature);
  }

  private resolveTimeoutMs(
    agentTimeoutMs: number | null,
    nodeConfig?: Record<string, unknown>,
    envTimeoutMs?: number,
  ): number {
    const envTimeout = envTimeoutMs ?? DEFAULT_LLM_TIMEOUT_MS;
    const nodeTimeout =
      typeof nodeConfig?.timeoutMs === 'number' ? nodeConfig.timeoutMs : undefined;
    const positiveTimeouts = [envTimeout, agentTimeoutMs ?? undefined, nodeTimeout].filter(
      (value): value is number => typeof value === 'number' && value > 0,
    );
    return Math.min(...positiveTimeouts);
  }
}

function buildPromptMessages(
  promptVersion: {
    messages?: ChatMessage[] | null;
    template?: string | null;
  },
  input: Record<string, unknown>,
  variablesSchema: Record<string, unknown>,
  promptRef: string,
): ChatMessage[] {
  if (promptVersion.messages && promptVersion.messages.length > 0) {
    return renderPromptMessages(promptVersion.messages, input, variablesSchema);
  }

  const template = promptVersion.template?.trim();
  if (template) {
    return [{ role: 'user', content: renderPromptTemplate(template, input, variablesSchema) }];
  }

  throw new Error(`Prompt ${promptRef} has no template or messages content`);
}

function buildToolEnrichmentMessage(enrichmentJson: string): ChatMessage {
  return {
    role: 'user',
    content: `[Tool enrichment]
\`\`\`json
${enrichmentJson}
\`\`\`

RULES for URLs/references:
- You MUST only use http(s) URLs that appear in the tool enrichment results above.
- If results is empty, return references as an empty array [].
- Do NOT invent, guess, or fabricate URLs.`,
  };
}

/** Interpolate `{{var}}` placeholders from mapped step input. */
export function renderPromptTemplate(
  template: string,
  variables: Record<string, unknown>,
  variablesSchema?: Record<string, unknown>,
): string {
  const requiredKeys = Array.isArray(variablesSchema?.required)
    ? (variablesSchema.required as string[])
    : [];

  for (const key of requiredKeys) {
    if (!hasVariableValue(variables, key)) {
      throw new Error(`Missing required prompt variable: ${key}`);
    }
  }

  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, name: string) => {
    if (!hasVariableValue(variables, name)) {
      return '';
    }
    const variableValue = variables[name];
    if (typeof variableValue === 'string') {
      return variableValue;
    }
    return JSON.stringify(variableValue);
  });
}

export function renderPromptMessages(
  messages: ChatMessage[],
  variables: Record<string, unknown>,
  variablesSchema?: Record<string, unknown>,
): ChatMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: renderPromptTemplate(message.content, variables, variablesSchema),
  }));
}

function hasVariableValue(variables: Record<string, unknown>, key: string): boolean {
  if (!(key in variables) || variables[key] === undefined || variables[key] === null) {
    return false;
  }
  const variableValue = variables[key];
  if (typeof variableValue === 'string' && variableValue.trim() === '') {
    return false;
  }
  return true;
}

function firstTrimmedString(...candidates: unknown[]): string | undefined {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return undefined;
}

function firstNumber(...candidates: unknown[]): number | undefined {
  for (const candidate of candidates) {
    if (typeof candidate === 'number') {
      return candidate;
    }
  }
  return undefined;
}
