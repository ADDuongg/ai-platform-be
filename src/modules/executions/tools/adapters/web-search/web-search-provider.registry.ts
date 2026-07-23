import type { WebSearchProvider, WebSearchProviderId } from './web-search.provider';

export class WebSearchProviderRegistry {
  private readonly byId = new Map<string, WebSearchProvider>();

  constructor(providers: WebSearchProvider[]) {
    for (const provider of providers) {
      this.byId.set(provider.id, provider);
    }
  }

  get(id: string): WebSearchProvider {
    const provider = this.byId.get(id);
    if (!provider) {
      throw new Error(
        `Unknown web-search provider "${id}". Registered: ${[...this.byId.keys()].join(', ') || '(none)'}`,
      );
    }
    return provider;
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  tryGet(id: string): WebSearchProvider | undefined {
    return this.byId.get(id);
  }

  ids(): WebSearchProviderId[] {
    return [...this.byId.keys()] as WebSearchProviderId[];
  }
}
