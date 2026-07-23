import { Injectable } from '@nestjs/common';

import type {
  WebSearchProvider,
  WebSearchProviderRequest,
  WebSearchProviderResult,
} from '../web-search.provider';

/**
 * Future: Gemini grounding / Google Search via Gemini API.
 * Registered for `configJson.provider = 'gemini'`; unavailable until implemented.
 *
 * Env (planned): reuse GEMINI_API_KEY from agentRunner / toolRuntime.
 */
@Injectable()
export class GeminiSearchProvider implements WebSearchProvider {
  readonly id = 'gemini' as const;

  isAvailable(_configJson: Record<string, unknown>): boolean {
    // Not wired yet — keep false so adapter falls back cleanly.
    return false;
  }

  async search(_request: WebSearchProviderRequest): Promise<WebSearchProviderResult> {
    throw new Error('gemini web-search provider is not implemented yet');
  }
}
