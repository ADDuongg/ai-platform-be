import { Injectable } from '@nestjs/common';

import type { ToolAdapter, ToolAdapterInvokeInput } from '../tool-adapter';

/**
 * MVP: stub-live local placeholder (no cloud image API).
 * Future: Flux cloud image generation API.
 */
@Injectable()
export class ImageGenerationAdapter implements ToolAdapter {
  readonly code = 'image-generation';

  async invoke(params: ToolAdapterInvokeInput): Promise<Record<string, unknown>> {
    const prompt = resolvePrompt(params.input);
    const slug = slugify(prompt).slice(0, 48) || 'image';
    const width = typeof params.input.width === 'number' ? params.input.width : 1024;
    const height = typeof params.input.height === 'number' ? params.input.height : 1024;
    return {
      provider: 'stub-live',
      promptEcho: prompt,
      assetUrl: buildStubPreviewDataUrl(slug, prompt),
      stubUri: `stub-live://image-generation/${slug}.png`,
      width,
      height,
    };
  }
}

function resolvePrompt(input: Record<string, unknown>): string {
  if (typeof input.prompt === 'string') {
    return input.prompt;
  }
  if (typeof input.description === 'string') {
    return input.description;
  }
  return JSON.stringify(input).slice(0, 500);
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
