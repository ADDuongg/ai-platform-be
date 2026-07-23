import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AllConfigType } from '@common/config';

import type { ToolAdapter, ToolAdapterInvokeInput } from '../tool-adapter';
import { fetchWithTimeout, sleep } from '../tool-http.util';

const DEFAULT_FLUX_BASE_URL = 'https://api.bfl.ai';
const DEFAULT_FLUX_ENDPOINT_PATH = '/v1/flux-2-pro';
const DEFAULT_FLUX_POLL_INTERVAL_MS = 500;
const DEFAULT_DIMENSION = 1024;
const MIN_DIMENSION = 64;
const MAX_DIMENSION = 2048;

type ImageProvider = 'flux' | 'stub-live';

type FluxSubmitResponse = {
  id?: string;
  polling_url?: string;
};

type FluxPollResponse = {
  status?: string;
  result?: {
    sample?: string;
    seed?: number;
    prompt?: string;
  };
  error?: string;
};

/**
 * Image generation: Flux (BFL) when `configJson.provider === 'flux'`,
 * otherwise stub-live local placeholder (CI / offline).
 */
@Injectable()
export class ImageGenerationAdapter implements ToolAdapter {
  readonly code = 'image-generation';

  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  async invoke(params: ToolAdapterInvokeInput): Promise<Record<string, unknown>> {
    const provider = resolveProvider(params.configJson.provider);
    if (provider === 'flux') {
      return this.invokeFlux(params);
    }
    return invokeStubLive(params);
  }

  private async invokeFlux(params: ToolAdapterInvokeInput): Promise<Record<string, unknown>> {
    const fluxCfg = this.configService.get('toolRuntime', { infer: true })?.flux;
    const apiKey = fluxCfg?.apiKey?.trim() ?? '';
    if (!apiKey) {
      throw new Error(
        'image-generation provider flux requires FLUX_API_KEY (or BFL_API_KEY). Set the env var or use provider stub-live.',
      );
    }

    const prompt = resolvePrompt(params.input);
    const width = normalizeDimension(params.input.width, DEFAULT_DIMENSION);
    const height = normalizeDimension(params.input.height, DEFAULT_DIMENSION);
    const baseUrl = (fluxCfg?.baseUrl ?? DEFAULT_FLUX_BASE_URL).replace(/\/$/, '');
    const endpointPath = fluxCfg?.endpointPath ?? DEFAULT_FLUX_ENDPOINT_PATH;
    const pollIntervalMs = fluxCfg?.pollIntervalMs ?? DEFAULT_FLUX_POLL_INTERVAL_MS;
    const submitUrl = `${baseUrl}${endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`}`;

    const deadline = Date.now() + params.timeoutMs;
    const submitTimeout = Math.max(1_000, deadline - Date.now());

    const submitRes = await fetchWithTimeout(
      submitUrl,
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          'x-key': apiKey,
        },
        body: JSON.stringify({ prompt, width, height }),
      },
      submitTimeout,
    );

    if (!submitRes.ok) {
      const body = await submitRes.text().catch(() => '');
      throw new Error(
        `image-generation flux submit HTTP ${submitRes.status}${body ? `: ${body.slice(0, 300)}` : ''}`,
      );
    }

    const submitJson = (await submitRes.json()) as FluxSubmitResponse;
    const requestId = typeof submitJson.id === 'string' ? submitJson.id : '';
    const pollingUrl = typeof submitJson.polling_url === 'string' ? submitJson.polling_url : '';
    if (!pollingUrl) {
      throw new Error('image-generation flux submit missing polling_url');
    }

    while (Date.now() < deadline) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;

      await sleep(Math.min(pollIntervalMs, remaining));

      const pollRemaining = deadline - Date.now();
      if (pollRemaining <= 0) break;

      const pollRes = await fetchWithTimeout(
        pollingUrl,
        {
          method: 'GET',
          headers: {
            accept: 'application/json',
            'x-key': apiKey,
          },
        },
        pollRemaining,
      );

      if (!pollRes.ok) {
        const body = await pollRes.text().catch(() => '');
        throw new Error(
          `image-generation flux poll HTTP ${pollRes.status}${body ? `: ${body.slice(0, 300)}` : ''}`,
        );
      }

      const pollJson = (await pollRes.json()) as FluxPollResponse;
      const status = pollJson.status ?? '';

      if (status === 'Ready') {
        const sample = pollJson.result?.sample;
        if (typeof sample !== 'string' || !sample.trim()) {
          throw new Error('image-generation flux Ready response missing result.sample');
        }
        return {
          provider: 'flux',
          promptEcho: prompt,
          assetUrl: sample,
          requestId,
          width,
          height,
          ...(typeof pollJson.result?.seed === 'number' ? { seed: pollJson.result.seed } : {}),
        };
      }

      if (status === 'Error' || status === 'Failed') {
        const detail = pollJson.error ?? status;
        throw new Error(`image-generation flux generation ${status}: ${detail}`);
      }
      // Pending / Queued / etc. — keep polling
    }

    throw new Error(`image-generation flux timed out after ${params.timeoutMs}ms`);
  }
}

function resolveProvider(raw: unknown): ImageProvider {
  if (raw === 'flux') return 'flux';
  return 'stub-live';
}

function invokeStubLive(params: ToolAdapterInvokeInput): Record<string, unknown> {
  const prompt = resolvePrompt(params.input);
  const slug = slugify(prompt).slice(0, 48) || 'image';
  const width = typeof params.input.width === 'number' ? params.input.width : DEFAULT_DIMENSION;
  const height = typeof params.input.height === 'number' ? params.input.height : DEFAULT_DIMENSION;
  return {
    provider: 'stub-live',
    promptEcho: prompt,
    assetUrl: buildStubPreviewDataUrl(slug, prompt),
    stubUri: `stub-live://image-generation/${slug}.png`,
    width,
    height,
  };
}

function resolvePrompt(input: Record<string, unknown>): string {
  if (typeof input.prompt === 'string' && input.prompt.trim()) {
    return input.prompt.trim();
  }
  if (typeof input.imagePrompt === 'string' && input.imagePrompt.trim()) {
    return input.imagePrompt.trim();
  }
  if (typeof input.description === 'string' && input.description.trim()) {
    return input.description.trim();
  }
  // Analysis/prep handoff: { imageGenPrompts: { prompts: [{ text }] } }
  const bundle = input.imageGenPrompts;
  if (bundle && typeof bundle === 'object' && !Array.isArray(bundle)) {
    const prompts = (bundle as { prompts?: unknown }).prompts;
    if (Array.isArray(prompts) && prompts[0] && typeof prompts[0] === 'object') {
      const text = (prompts[0] as { text?: unknown }).text;
      if (typeof text === 'string' && text.trim()) {
        return text.trim();
      }
    }
  }
  return JSON.stringify(input).slice(0, 500);
}

function normalizeDimension(raw: unknown, fallback: number): number {
  const n = typeof raw === 'number' && Number.isFinite(raw) ? Math.round(raw) : fallback;
  const clamped = Math.min(MAX_DIMENSION, Math.max(MIN_DIMENSION, n));
  return Math.round(clamped / 16) * 16 || fallback;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildStubPreviewDataUrl(slug: string, prompt: string): string {
  let colorSeed = 0;
  for (let i = 0; i < slug.length; i += 1) {
    colorSeed = (colorSeed * 31 + slug.charCodeAt(i)) >>> 0;
  }
  const hue = colorSeed % 360;
  const hue2 = (hue + 48) % 360;
  const title = escapeXml((prompt.trim().slice(0, 48) || slug).replace(/\s+/g, ' '));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue} 55% 78%)"/>
      <stop offset="100%" stop-color="hsl(${hue2} 50% 62%)"/>
    </linearGradient>
  </defs>
  <rect width="640" height="480" fill="url(#g)"/>
  <rect x="48" y="48" width="544" height="384" rx="28" fill="rgba(255,255,255,0.35)"/>
  <text x="320" y="220" text-anchor="middle" font-family="system-ui,sans-serif" font-size="24" fill="#1f2937">${title}</text>
  <text x="320" y="262" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" fill="#4b5563">stub-live image preview</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
