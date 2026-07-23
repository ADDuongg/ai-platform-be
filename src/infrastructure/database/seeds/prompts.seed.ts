import { PromptEntity } from '@modules/prompts/entities/prompt.entity';
import { PromptVersionEntity } from '@modules/prompts/entities/prompt-version.entity';
import { PromptStatus, PromptVersionStatus } from '@modules/prompts/enums';
import { AgentVersionEntity } from '@modules/agents/entities/agent-version.entity';
import { AgentEntity } from '@modules/agents/entities/agent.entity';

import AppDataSource from '../data-source';

const SAMPLE_PROMPTS: Array<{
  code: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  template: string;
  variablesSchema: Record<string, unknown>;
  modelHints?: Record<string, unknown>;
  wireAgentCode?: string;
}> = [
  {
    code: 'fashion-trend-research-prompt',
    name: 'Fashion Trend Research',
    description: 'Kids fashion trend research → trendFindings JSON',
    category: 'kids-fashion',
    tags: ['kids-fashion', 'research'],
    template: `You are a kids fashion trend researcher for apparel brands.

Season: {{season}}
Category: {{category}}
Market: {{market}}
Age band: {{ageBand}}
Constraints (JSON): {{constraints}}

Task:
- Produce practical, age-appropriate commercial trend signals for this category/market/season.
- Prefer wearable directions (school + play + weekend), not adult runway fantasy.
- Cover DISTINCT angles — do not repeat the same idea with different wording. Aim to include a mix of: silhouette/fit, color/print, fabric/hand-feel, detail/hardware, occasion/use-case (when enrichment supports them).
- If tool enrichment (web-search) is present, GROUND every trend in that enrichment. Prefer titles/snippets/URLs from the tool payload. Do NOT invent URLs or cite sources that are not in enrichment.
- If enrichment is thin/empty: still return 5 trends as best-effort commercial hypotheses, set confidence ≤ 0.45, put evidence=[], and say in notes that evidence was limited.

Evidence rules (per trend):
- EVERY trend MUST include keys "notes" (string) and "evidence" (array). Never omit these keys.
- Include 1-3 evidence items when URLs/snippets exist in enrichment; if none, set "evidence": [].
- Each evidence item MUST include title, url, quote (url exact from enrichment only, or "").
- notes MUST explain WHY this is commercial for {{category}} in {{market}} / {{season}}, and how the evidence supports it (1-3 sentences).

Quality bar:
- Exactly 5 to 7 trends (prefer 6 when enrichment allows).
- summary: 3-5 sentences synthesizing the top commercial directions + how strong the evidence is overall.
- confidence: 0-1; higher only when multiple enrichment signals align; lower when speculative.

Respond with ONE JSON object only (no markdown), matching:
{
  "trendFindings": {
    "summary": "string",
    "trends": [
      {
        "name": "string",
        "confidence": 0.0,
        "notes": "string",
        "evidence": [
          { "title": "string", "url": "string", "quote": "string" }
        ]
      }
    ]
  }
}`,
    variablesSchema: {
      type: 'object',
      required: ['season', 'category', 'market'],
      properties: {
        season: { type: 'string' },
        category: { type: 'string' },
        market: { type: 'string' },
        ageBand: { type: 'string' },
        constraints: { type: 'object' },
      },
    },
    modelHints: { temperature: 0.4 },
    wireAgentCode: 'fashion-trend-research',
  },
  {
    code: 'fashion-style-analysis-prompt',
    name: 'Fashion Style Analysis',
    description: 'Trend → styleReport + one visual FLUX.2 Pro imagePrompt (constraints baked in)',
    category: 'kids-fashion',
    tags: ['kids-fashion', 'analysis'],
    template: `You are a kids fashion design analyst preparing ONE image for FLUX.2 Pro.

Season: {{season}}
Category: {{category}}
Market: {{market}}
Age band: {{ageBand}}
Constraints (JSON): {{constraints}}
Trend findings (JSON): {{trendFindings}}

Task:
1) Write a concise commercial styleReport grounded in trendFindings.
2) Write exactly ONE English imagePrompt for FLUX.2 Pro (not a dump of trend JSON).

Style report rules:
- Prioritize the highest-confidence trends that have evidence (evidence.url / quote). If evidence is empty, say so briefly in summary and keep confidence-aware wording.
- summary: name the 2-3 trends you selected and why they win commercially for {{category}} / {{market}} / {{season}}.
- colorDirection / silhouette / mustHaves / avoid: concrete and actionable; mustHaves should map to selected trends (not generic filler).
- Prefer trends with evidence over speculative low-confidence ones when they conflict.

imagePrompt MUST be photographic and concrete:
- Subject: on-model kids apparel OR clean product flat-lay (pick one; default on-model)
- Age: state the age band explicitly (e.g. "child age 4-8")
- Garment: category, silhouette, fabric hand-feel, construction details
- Color: name colors with hex, e.g. "#F5E6D3 cream", "#A8D5E5 pastel blue"
- Lighting: soft studio / natural window light (name it)
- Background: simple studio or soft lifestyle backdrop (no clutter collage)
- Composition: single hero look, portrait framing, one garment focus

HARD CONSTRAINTS — bake these into the imagePrompt as explicit negatives/forbids (do not omit):
- Age-appropriate only for {{ageBand}}
- No neon overload / harsh neon (unless constraints explicitly allow)
- No brand logos, no readable trademark text, no licensed characters
- No NSFW, no adult styling
- Also include every mustAvoid / avoid item from Constraints JSON verbatim in the forbid list

Do NOT output multiple prompts, variations, or a collage description.

Respond with ONE JSON object only (no markdown):
{
  "styleReport": {
    "summary": "string",
    "colorDirection": "string",
    "silhouette": "string",
    "mustHaves": ["string"],
    "avoid": ["string"]
  },
  "imagePrompt": "string"
}`,
    variablesSchema: {
      type: 'object',
      required: ['season', 'category', 'market', 'trendFindings'],
      properties: {
        season: { type: 'string' },
        category: { type: 'string' },
        market: { type: 'string' },
        ageBand: { type: 'string' },
        constraints: { type: 'object' },
        trendFindings: { type: 'object' },
      },
    },
    modelHints: { temperature: 0.45 },
    wireAgentCode: 'fashion-style-analysis',
  },
  {
    code: 'fashion-image-generator-prompt',
    name: 'Fashion Image Generator',
    description: 'Package single FLUX result into rawGenerations[0] only',
    category: 'kids-fashion',
    tags: ['kids-fashion', 'image-generation'],
    template: `You package image-generation tool results for a kids fashion pipeline.

Season: {{season}}
Category: {{category}}
Market: {{market}}
Style report (JSON): {{styleReport}}
Image prompt used for generation: {{prompt}}

A tool enrichment message may include an image-generation result with assetUrl (and optional promptEcho).

MVP rule: return EXACTLY ONE item in rawGenerations (one image per run). Do not invent a second variation.

Respond with ONE JSON object only (no markdown):
{
  "rawGenerations": [
    {
      "id": "gen-1",
      "label": "Hero look",
      "assetUrl": "string from tool result (required — copy exactly, do not invent URLs)",
      "promptEcho": "string",
      "notes": "string"
    }
  ]
}

Rules:
- Copy assetUrl from tool enrichment exactly (no invented http(s) URLs).
- rawGenerations length MUST be 1.
- If enrichment somehow has multiple assets, keep only the first.`,
    variablesSchema: {
      type: 'object',
      required: ['prompt'],
      properties: {
        prompt: { type: 'string' },
        season: { type: 'string' },
        category: { type: 'string' },
        market: { type: 'string' },
        styleReport: { type: 'object' },
        width: { type: 'number' },
        height: { type: 'number' },
      },
    },
    modelHints: { temperature: 0.1 },
    wireAgentCode: 'fashion-image-generator',
  },
  {
    code: 'research-brief',
    name: 'Research Brief',
    description: 'Demo research brief for research-agent',
    category: 'demo',
    tags: ['demo', 'research'],
    template: `You are a research assistant. Given a topic and audience, produce a concise research brief.

Topic: {{topic}}
Audience: {{audience}}

Respond with ONE JSON object only: { "result": "string brief" }`,
    variablesSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string' },
        audience: { type: 'string' },
      },
      required: ['topic'],
    },
    wireAgentCode: 'research-agent',
  },
  {
    code: 'review-brief',
    name: 'Review Brief',
    description: 'Demo review template for review-agent',
    category: 'demo',
    tags: ['demo', 'review'],
    template: `You are a reviewer. Given research output, produce a short review.

Research: {{research}}

Respond with ONE JSON object only: { "result": "string review" }`,
    variablesSchema: {
      type: 'object',
      properties: {
        research: { type: 'string' },
      },
      required: ['research'],
    },
    wireAgentCode: 'review-agent',
  },
];

export async function seedPrompts(): Promise<void> {
  const startedHere = !AppDataSource.isInitialized;
  if (startedHere) {
    await AppDataSource.initialize();
  }

  const promptRepo = AppDataSource.getRepository(PromptEntity);
  const versionRepo = AppDataSource.getRepository(PromptVersionEntity);
  const agentRepo = AppDataSource.getRepository(AgentEntity);
  const agentVersionRepo = AppDataSource.getRepository(AgentVersionEntity);

  for (const sample of SAMPLE_PROMPTS) {
    let prompt = await promptRepo.findOne({ where: { code: sample.code } });

    if (!prompt) {
      prompt = await promptRepo.save(
        promptRepo.create({
          code: sample.code,
          name: sample.name,
          description: sample.description,
          category: sample.category,
          tags: sample.tags,
          status: PromptStatus.PUBLISHED,
          enabled: true,
          currentVersion: 1,
          createdBy: null,
        }),
      );
    } else {
      prompt.name = sample.name;
      prompt.description = sample.description;
      prompt.category = sample.category;
      prompt.tags = sample.tags;
      prompt.status = PromptStatus.PUBLISHED;
      prompt.enabled = true;
      prompt.currentVersion = prompt.currentVersion ?? 1;
      await promptRepo.save(prompt);
    }

    const version = await versionRepo.findOne({
      where: { promptId: prompt.id, version: 1 },
    });

    if (!version) {
      await versionRepo.save(
        versionRepo.create({
          promptId: prompt.id,
          version: 1,
          status: PromptVersionStatus.PUBLISHED,
          template: sample.template,
          messages: null,
          variablesSchema: sample.variablesSchema,
          modelHints: sample.modelHints ?? { temperature: 0.5 },
          changelog: 'Seeded prompt v1',
          publishedAt: new Date(),
          createdBy: null,
        }),
      );
    } else {
      version.status = PromptVersionStatus.PUBLISHED;
      version.template = sample.template;
      version.variablesSchema = sample.variablesSchema;
      version.modelHints = sample.modelHints ?? version.modelHints ?? { temperature: 0.5 };
      version.publishedAt = version.publishedAt ?? new Date();
      await versionRepo.save(version);
    }

    if (sample.wireAgentCode) {
      const agent = await agentRepo.findOne({ where: { code: sample.wireAgentCode } });
      if (agent?.currentVersion) {
        const agentVersion = await agentVersionRepo.findOne({
          where: { agentId: agent.id, version: agent.currentVersion },
        });
        if (agentVersion) {
          agentVersion.promptRef = sample.code;
          await agentVersionRepo.save(agentVersion);
          console.log(`Wired ${sample.wireAgentCode} promptRef → ${sample.code}`);
        }
      }
    }

    console.log(`Sample prompt ready: ${sample.code}`);
  }

  console.log('Prompts seed completed');

  if (startedHere) {
    await AppDataSource.destroy();
  }
}

if (require.main === module) {
  seedPrompts().catch(async (error: unknown) => {
    console.error('Prompts seed failed', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  });
}
