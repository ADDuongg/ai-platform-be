import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AllConfigType } from '@common/config';
import { ToolsService } from '@modules/tools/services/tools.service';

import {
  DEFAULT_TOOL_RESULT_MAX_BYTES,
  DEFAULT_TOOL_STORAGE_ROOT,
  DEFAULT_TOOL_TIMEOUT_MS,
  TOOL_ADAPTER_REGISTRY,
} from '../constants/executions.constants';
import { pickFirstHttpUrl } from './reference-url.sanitizer';
import type { ToolEnrichmentBundle, ToolEnrichmentItem } from './tool-adapter';
import { sleep } from './tool-http.util';
import type { ToolAdapterRegistry } from './tool-registry';

export type ToolInvokerContext = {
  executionId?: string;
  agentCode?: string;
};

@Injectable()
export class ToolInvokerService {
  private readonly logger = new Logger(ToolInvokerService.name);

  constructor(
    private readonly toolsService: ToolsService,
    private readonly configService: ConfigService<AllConfigType>,
    @Optional()
    @Inject(TOOL_ADAPTER_REGISTRY)
    private readonly registry?: ToolAdapterRegistry,
  ) {}

  async invokeAll(
    toolRefs: string[],
    input: Record<string, unknown>,
    ctx: ToolInvokerContext = {},
  ): Promise<ToolEnrichmentBundle> {
    if (!this.registry) {
      throw new Error('Tool adapter registry is not configured');
    }

    const codes = toolRefs.map((code) => code.trim().toLowerCase()).filter(Boolean);
    if (codes.length === 0) {
      return { tools: [] };
    }

    const toolCfg = this.configService.get('toolRuntime', { infer: true });
    const maxBytes = toolCfg?.resultMaxBytes ?? DEFAULT_TOOL_RESULT_MAX_BYTES;
    const storageRoot = toolCfg?.storageRoot ?? DEFAULT_TOOL_STORAGE_ROOT;

    const items: ToolEnrichmentItem[] = [];

    for (const code of codes) {
      const item = await this.invokeTool(code, input, items, ctx, maxBytes, storageRoot);
      items.push(item);
    }

    return { tools: items };
  }

  private async invokeTool(
    code: string,
    input: Record<string, unknown>,
    priorItems: ToolEnrichmentItem[],
    ctx: ToolInvokerContext,
    maxBytes: number,
    storageRoot: string,
  ): Promise<ToolEnrichmentItem> {
    const { tool, version } = await this.toolsService.resolvePublishedByCode(code);
    const adapter = this.registry!.get(tool.code);
    if (!adapter) {
      throw new Error(`Unsupported tool adapter for code=${tool.code} (toolType=${tool.toolType})`);
    }

    const { timeoutMs, maxRetries } = resolveVersionLimits(version);
    const adapterInput = this.buildAdapterInput(tool.code, input, priorItems, ctx);

    if (tool.code === 'web-browser' && !hasExplicitUrl(adapterInput)) {
      this.logger.warn(
        `Tool skip code=web-browser agent=${ctx.agentCode ?? '-'}: no url in input or prior tools`,
      );
      return {
        code: tool.code,
        result: {
          provider: 'native-fetch',
          skipped: true,
          reason: 'no url available from input or prior tool results',
        },
      };
    }

    const result = await this.invokeWithRetries(
      () =>
        adapter.invoke({
          code: tool.code,
          input: adapterInput,
          configJson: version.configJson ?? {},
          timeoutMs,
          maxBytes,
          storageRoot,
        }),
      maxRetries,
      tool.code,
    );

    this.logger.debug(
      `Tool invoke ok code=${tool.code} agent=${ctx.agentCode ?? '-'} bytes≈${Buffer.from(JSON.stringify(result)).byteLength}`,
    );

    return { code: tool.code, result };
  }

  private async invokeWithRetries(
    fn: () => Promise<Record<string, unknown>>,
    maxRetries: number,
    code: string,
  ): Promise<Record<string, unknown>> {
    let lastError: unknown;
    const attempts = maxRetries + 1;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Tool invoke failed code=${code} attempt=${attempt}/${attempts}: ${message}`,
        );
        if (attempt < attempts) {
          await sleep(Math.min(250 * attempt, 1000));
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(`Tool ${code} failed: ${String(lastError)}`);
  }

  private buildAdapterInput(
    code: string,
    input: Record<string, unknown>,
    priorItems: ToolEnrichmentItem[],
    ctx: ToolInvokerContext,
  ): Record<string, unknown> {
    const adapterInput: Record<string, unknown> = {
      ...input,
      ...(ctx.executionId ? { executionId: ctx.executionId } : {}),
    };

    if (code !== 'web-browser' || hasExplicitUrl(adapterInput)) {
      return adapterInput;
    }

    const urlFromPriorTools = pickFirstHttpUrl(priorItems.map((item) => item.result));
    const urlFromStepInput = urlFromPriorTools ? null : pickFirstHttpUrl(input);
    const chainedUrl = urlFromPriorTools ?? urlFromStepInput;

    if (chainedUrl) {
      adapterInput.url = chainedUrl;
      this.logger.debug(
        `Tool input chain code=web-browser url=${chainedUrl} source=${urlFromPriorTools ? 'prior-tools' : 'step-input'}`,
      );
    }

    return adapterInput;
  }
}

function resolveVersionLimits(version: { timeoutMs?: number | null; maxRetries?: number | null }): {
  timeoutMs: number;
  maxRetries: number;
} {
  const timeoutMs =
    typeof version.timeoutMs === 'number' && version.timeoutMs > 0
      ? version.timeoutMs
      : DEFAULT_TOOL_TIMEOUT_MS;
  const maxRetries =
    typeof version.maxRetries === 'number' && version.maxRetries >= 0 ? version.maxRetries : 0;
  return { timeoutMs, maxRetries };
}

function hasExplicitUrl(input: Record<string, unknown>): boolean {
  return [input.url, input.href, input.pageUrl].some(
    (value) => typeof value === 'string' && value.trim().length > 0,
  );
}
