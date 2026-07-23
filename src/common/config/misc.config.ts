import { registerAs } from '@nestjs/config';

import {
  AgentRunnerConfig,
  ArtifactStorageConfig,
  CorsConfig,
  LoggerConfig,
  ThrottleConfig,
  ToolRuntimeConfig,
} from './config.type';

export const throttleConfig = registerAs('throttle', (): ThrottleConfig => ({
  ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10),
  limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
}));

export const corsConfig = registerAs('cors', (): CorsConfig => ({
  origins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
}));

export const loggerConfig = registerAs('logger', (): LoggerConfig => ({
  level: process.env.LOG_LEVEL ?? 'info',
}));

export const agentRunnerConfig = registerAs('agentRunner', (): AgentRunnerConfig => {
  const mode = (process.env.AGENT_RUNNER ?? 'stub').toLowerCase() as AgentRunnerConfig['mode'];
  const ollamaModel = process.env.OLLAMA_MODEL ?? 'llama3.2';
  const openaiModel = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  const anthropicModel = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514';
  const geminiModel = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
  const defaultModel =
    mode === 'openai'
      ? openaiModel
      : mode === 'anthropic'
        ? anthropicModel
        : mode === 'gemini'
          ? geminiModel
          : ollamaModel;

  return {
    mode,
    defaultModel,
    timeoutMs: parseInt(
      process.env.LLM_TIMEOUT_MS ?? process.env.OLLAMA_TIMEOUT_MS ?? '120000',
      10,
    ),
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434',
      model: ollamaModel,
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY ?? '',
      baseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
      model: openaiModel,
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY ?? '',
      baseUrl: process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com',
      model: anthropicModel,
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY ?? '',
      model: geminiModel,
    },
  };
});

export const toolRuntimeConfig = registerAs('toolRuntime', (): ToolRuntimeConfig => {
  const mode = (process.env.TOOL_RUNTIME ?? 'stub').toLowerCase() as ToolRuntimeConfig['mode'];
  return {
    mode,
    storageRoot: process.env.TOOL_STORAGE_ROOT ?? '.data/tool-storage',
    resultMaxBytes: parseInt(process.env.TOOL_RESULT_MAX_BYTES ?? '262144', 10),
    flux: {
      apiKey: process.env.FLUX_API_KEY || process.env.BFL_API_KEY || '',
      baseUrl: process.env.FLUX_BASE_URL ?? 'https://api.bfl.ai',
      endpointPath: process.env.FLUX_ENDPOINT_PATH ?? '/v1/flux-2-pro',
      pollIntervalMs: parseInt(process.env.FLUX_POLL_INTERVAL_MS ?? '500', 10),
    },
  };
});

export const artifactStorageConfig = registerAs(
  'artifactStorage',
  (): ArtifactStorageConfig => {
    const mode = (process.env.ARTIFACT_STORAGE ?? 'local').toLowerCase() as
      | 'local'
      | 's3';
    return {
      mode: mode === 's3' ? 's3' : 'local',
      storageRoot: process.env.ARTIFACT_STORAGE_ROOT ?? '.data/execution-artifacts',
    };
  },
);
