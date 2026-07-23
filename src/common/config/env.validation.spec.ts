import { envValidationSchema } from './env.validation';

describe('envValidationSchema AGENT_RUNNER + TOOL_RUNTIME', () => {
  const base = {
    APP_URL: 'http://localhost:3000',
    DB_HOST: 'localhost',
    DB_USERNAME: 'u',
    DB_PASSWORD: 'p',
    DB_DATABASE: 'db',
    REDIS_HOST: 'localhost',
    JWT_SECRET: 'x'.repeat(32),
    CORS_ORIGINS: 'http://localhost:3000',
  };

  it('defaults AGENT_RUNNER to stub', () => {
    const { value, error } = envValidationSchema.validate(base);
    expect(error).toBeUndefined();
    expect(value.AGENT_RUNNER).toBe('stub');
    expect(value.OLLAMA_TIMEOUT_MS).toBe(120_000);
  });

  it('defaults TOOL_RUNTIME to stub', () => {
    const { value, error } = envValidationSchema.validate(base);
    expect(error).toBeUndefined();
    expect(value.TOOL_RUNTIME).toBe('stub');
    expect(value.TOOL_STORAGE_ROOT).toBe('.data/tool-storage');
    expect(value.TOOL_RESULT_MAX_BYTES).toBe(262_144);
    expect(value.ARTIFACT_STORAGE).toBe('local');
    expect(value.ARTIFACT_STORAGE_ROOT).toBe('.data/execution-artifacts');
  });

  it('accepts ollama mode', () => {
    const { value, error } = envValidationSchema.validate({
      ...base,
      AGENT_RUNNER: 'ollama',
      OLLAMA_MODEL: 'llama3.2',
    });
    expect(error).toBeUndefined();
    expect(value.AGENT_RUNNER).toBe('ollama');
  });

  it('accepts TOOL_RUNTIME=live', () => {
    const { value, error } = envValidationSchema.validate({
      ...base,
      TOOL_RUNTIME: 'live',
      TOOL_STORAGE_ROOT: '/tmp/tools',
    });
    expect(error).toBeUndefined();
    expect(value.TOOL_RUNTIME).toBe('live');
    expect(value.TOOL_STORAGE_ROOT).toBe('/tmp/tools');
  });

  it('accepts openai/anthropic/gemini modes', () => {
    for (const mode of ['openai', 'anthropic', 'gemini'] as const) {
      const { value, error } = envValidationSchema.validate({
        ...base,
        AGENT_RUNNER: mode,
      });
      expect(error).toBeUndefined();
      expect(value.AGENT_RUNNER).toBe(mode);
    }
  });

  it('accepts empty anthropic/openai/flux api keys', () => {
    const { error } = envValidationSchema.validate({
      ...base,
      OPENAI_API_KEY: '',
      ANTHROPIC_API_KEY: '',
      ANTHROPIC_MODEL: 'claude-sonnet-4-20250514',
      FLUX_API_KEY: '',
      BFL_API_KEY: '',
    });
    expect(error).toBeUndefined();
  });

  it('rejects invalid AGENT_RUNNER', () => {
    const { error } = envValidationSchema.validate({
      ...base,
      AGENT_RUNNER: 'claude',
    });
    expect(error).toBeDefined();
    expect(error?.message).toMatch(/AGENT_RUNNER/);
  });

  it('rejects invalid TOOL_RUNTIME', () => {
    const { error } = envValidationSchema.validate({
      ...base,
      TOOL_RUNTIME: 'foo',
    });
    expect(error).toBeDefined();
    expect(error?.message).toMatch(/TOOL_RUNTIME/);
  });
});
