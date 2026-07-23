export type LlmCatalogModel = {
  id: string;
  label: string;
};

export type LlmCatalogProvider = {
  id: 'openai' | 'anthropic' | 'ollama' | 'gemini';
  label: string;
  defaultModel: string;
  models: LlmCatalogModel[];
};

/**
 * Static allowlist for FE select + agent config validation.
 *
 * Dynamic upgrade (commented — keep for later):
 * - OpenAI: GET {OPENAI_BASE_URL}/models with Authorization: Bearer {OPENAI_API_KEY}
 * - Anthropic: no public models.list; keep curated allowlist or Anthropic Console sync
 * - Ollama: GET {OLLAMA_BASE_URL}/api/tags
 * - Gemini: GET https://generativelanguage.googleapis.com/v1beta/models?key={GEMINI_API_KEY}
 *
 * Filter vendor list against product allowlist before exposing to FE.
 */
export const LLM_CATALOG: readonly LlmCatalogProvider[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    models: [
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
      { id: 'gpt-4.1', label: 'GPT-4.1' },
      { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
    ],
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    models: [
      { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
      { id: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
      { id: 'claude-haiku-4-20250514', label: 'Claude Haiku 4' },
    ],
  },
  {
    id: 'ollama',
    label: 'Ollama',
    defaultModel: 'llama3.2',
    models: [
      { id: 'llama3.2', label: 'Llama 3.2' },
      { id: 'llama3.1', label: 'Llama 3.1' },
      { id: 'mistral', label: 'Mistral' },
      { id: 'qwen2.5', label: 'Qwen 2.5' },
    ],
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    defaultModel: 'gemini-2.0-flash',
    models: [
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    ],
  },
] as const;

export type LlmCatalogProviderId = (typeof LLM_CATALOG)[number]['id'];

export function findCatalogProvider(id: string): LlmCatalogProvider | undefined {
  return LLM_CATALOG.find((provider) => provider.id === id);
}
