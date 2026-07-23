import type { LlmProviderId } from '../constants/executions.constants';
import type { LlmChatProvider } from './llm-chat.provider';

export class LlmProviderRegistry {
  private readonly byId = new Map<string, LlmChatProvider>();

  constructor(providers: LlmChatProvider[]) {
    for (const provider of providers) {
      this.byId.set(provider.id, provider);
    }
  }

  get(id: string): LlmChatProvider {
    const provider = this.byId.get(id);
    if (!provider) {
      throw new Error(
        `Unknown LLM provider "${id}". Registered: ${[...this.byId.keys()].join(', ') || '(none)'}`,
      );
    }
    return provider;
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  ids(): LlmProviderId[] {
    return [...this.byId.keys()] as LlmProviderId[];
  }
}
