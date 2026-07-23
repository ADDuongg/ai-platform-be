import { Injectable } from '@nestjs/common';

import type {
  WebSearchProvider,
  WebSearchProviderRequest,
  WebSearchProviderResult,
} from '../web-search.provider';

/**
 * Future: Google Custom Search JSON API.
 * Registered so `configJson.provider = 'google-cse'` resolves, but not available until keys exist.
 *
 * Env (planned): GOOGLE_CSE_API_KEY, GOOGLE_CSE_CX
 */
@Injectable()
export class GoogleCseSearchProvider implements WebSearchProvider {
  readonly id = 'google-cse' as const;

  isAvailable(_configJson: Record<string, unknown>): boolean {
    const key = process.env.GOOGLE_CSE_API_KEY?.trim();
    const cx = process.env.GOOGLE_CSE_CX?.trim();
    return Boolean(key && cx);
  }

  async search(_request: WebSearchProviderRequest): Promise<WebSearchProviderResult> {
    if (!this.isAvailable({})) {
      throw new Error(
        'google-cse provider is not configured (set GOOGLE_CSE_API_KEY + GOOGLE_CSE_CX)',
      );
    }
    // Implementation deferred — keep registry extensible without shipping paid path yet.
    throw new Error('google-cse search is not implemented yet');
  }
}
