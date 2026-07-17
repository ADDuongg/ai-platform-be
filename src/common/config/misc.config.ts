import { registerAs } from '@nestjs/config';

import {
  AgentRunnerConfig,
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
  const geminiModel = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
  const defaultModel =
    mode === 'openai' ? openaiModel : mode === 'gemini' ? geminiModel : ollamaModel;

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
  };
});
