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
  wireAgentCode?: string;
}> = [
  {
    code: 'research-brief',
    name: 'Research Brief',
    description: 'Standard research brief template for research agents',
    category: 'research',
    tags: ['research', 'brief'],
    template: `You are a research assistant. Given a topic, produce a concise research brief.

Topic: {{topic}}

Requirements:
- Summarize key findings in 3-5 bullet points
- Include relevant sources where possible
- Note any gaps or areas needing further investigation`,
    variablesSchema: {
      type: 'object',
      properties: { topic: { type: 'string' } },
      required: ['topic'],
    },
    wireAgentCode: 'research-agent',
  },
  {
    code: 'fashion-trend-research-prompt',
    name: 'Fashion Trend Research',
    description: 'Kids fashion trend signal gathering',
    category: 'kids-fashion',
    tags: ['fashion', 'trends', 'milestone-2'],
    template: `You research kids fashion trends.

Season: {{season}}
Category: {{category}}
Market: {{market}}
Age band: {{ageBand}}
Constraints: {{constraints}}

Return ONLY a JSON object with this exact shape (no markdown, no extra top-level keys):
{
  "trendFindings": {
    "summary": "string",
    "trends": [ { "name": "string", "description": "string" } ]
  }
}
trends MUST be a JSON array, never a string.`,
    variablesSchema: {
      type: 'object',
      properties: {
        season: { type: 'string' },
        category: { type: 'string' },
        market: { type: 'string' },
        ageBand: { type: 'string' },
        constraints: { type: 'string' },
      },
      required: ['season', 'category', 'market'],
    },
    wireAgentCode: 'fashion-trend-research',
  },
  {
    code: 'fashion-reference-collector-prompt',
    name: 'Fashion Reference Collector',
    description: 'Collect textual/URL references for kids fashion research',
    category: 'kids-fashion',
    tags: ['fashion', 'references', 'milestone-2'],
    template: `Given trend findings for kids fashion, collect reference sources (title, URL, notes).

Season: {{season}}
Category: {{category}}
Market: {{market}}
Trend findings: {{trendFindings}}

Return ONLY a JSON object with this exact shape:
{
  "references": [
    { "title": "string", "url": "string", "notes": "string" }
  ]
}
references MUST be a JSON array, never a string.
CRITICAL: Only include URLs that appear in Tool enrichment search results. If enrichment results is empty, return "references": []. Never invent URLs.`,
    variablesSchema: {
      type: 'object',
      properties: {
        season: { type: 'string' },
        category: { type: 'string' },
        market: { type: 'string' },
        trendFindings: { type: 'object' },
      },
      required: ['season', 'category', 'market'],
    },
    wireAgentCode: 'fashion-reference-collector',
  },
  {
    code: 'fashion-research-report-prompt',
    name: 'Fashion Research Report',
    description: 'Synthesize kids fashion research report',
    category: 'kids-fashion',
    tags: ['fashion', 'report', 'milestone-2'],
    template: `Synthesize a research report for kids fashion.

Season: {{season}}
Category: {{category}}
Market: {{market}}
Trend findings: {{trendFindings}}
References: {{references}}

Return ONLY a JSON object with this exact shape:
{
  "researchReport": {
    "summary": "string",
    "trends": [ { "name": "string", "description": "string" } ],
    "references": [ { "title": "string", "url": "string", "notes": "string" } ],
    "gaps": [ "string" ]
  }
}
trends, references, and gaps MUST be JSON arrays, never strings.
CRITICAL: researchReport.references URLs MUST come from Tool enrichment or the References input above. If none are available, use "references": [] and list the gap. Never invent URLs.`,
    variablesSchema: {
      type: 'object',
      properties: {
        season: { type: 'string' },
        category: { type: 'string' },
        market: { type: 'string' },
        trendFindings: { type: 'object' },
        references: { type: 'array' },
      },
      required: ['season', 'category', 'market'],
    },
    wireAgentCode: 'fashion-research-report',
  },
  {
    code: 'fashion-image-search-prompt',
    name: 'Fashion Image Search',
    description: 'Search visual reference candidates for kids fashion',
    category: 'kids-fashion',
    tags: ['fashion', 'reference-image', 'milestone-2'],
    template: `You search for visual reference candidates for kids fashion inspiration.

Season: {{season}}
Category: {{category}}
Market: {{market}}
Age band: {{ageBand}}
Constraints: {{constraints}}
Research report: {{researchReport}}
References: {{references}}
Trend findings: {{trendFindings}}

Return imageCandidates as a list of items with title, url, optional thumbnailUrl and notes.
Do not download binary images — metadata pointers only.`,
    variablesSchema: {
      type: 'object',
      properties: {
        season: { type: 'string' },
        category: { type: 'string' },
        market: { type: 'string' },
        ageBand: { type: 'string' },
        constraints: { type: 'string' },
        researchReport: { type: 'object' },
        references: { type: 'array' },
        trendFindings: { type: 'object' },
      },
      required: ['season', 'category', 'market'],
    },
    wireAgentCode: 'fashion-image-search',
  },
  {
    code: 'fashion-reference-grouper-prompt',
    name: 'Fashion Reference Grouper',
    description: 'Group visual references by theme/style',
    category: 'kids-fashion',
    tags: ['fashion', 'reference-image', 'milestone-2'],
    template: `Group imageCandidates into thematic clusters for kids fashion.

Season: {{season}}
Category: {{category}}
Market: {{market}}
Image candidates: {{imageCandidates}}
Research report: {{researchReport}}

Return EXACTLY this JSON shape (one object, one key):
{
  "groupedReferences": [
    { "group": "<theme name>", "items": ["<url from candidates>", "..."] }
  ]
}
Do NOT repeat the keys "group"/"items" at the root. Put every cluster inside the groupedReferences array.
Only use URLs that appear in imageCandidates.`,
    variablesSchema: {
      type: 'object',
      properties: {
        season: { type: 'string' },
        category: { type: 'string' },
        market: { type: 'string' },
        imageCandidates: { type: 'array' },
        researchReport: { type: 'object' },
      },
      required: ['season', 'category', 'market'],
    },
    wireAgentCode: 'fashion-reference-grouper',
  },
  {
    code: 'fashion-inspiration-organizer-prompt',
    name: 'Fashion Inspiration Organizer',
    description: 'Organize inspiration board from grouped references',
    category: 'kids-fashion',
    tags: ['fashion', 'reference-image', 'milestone-2'],
    template: `Organize an inspiration board for kids fashion.

Season: {{season}}
Category: {{category}}
Market: {{market}}
Image candidates: {{imageCandidates}}
Grouped references: {{groupedReferences}}

Return a JSON object with key inspirationBoard only:
{
  "inspirationBoard": {
    "summary": "<non-empty string overview>",
    "groups": [ { "group": "<name>", "description": "<string>", "items": ["<url>", ...] } ],
    "references": [ { "title": "<string>", "url": "<http url from candidates>", "notes": "<string>" } ],
    "notes": "<string, use empty string if none>"
  }
}
Use empty string "" for missing text fields — never null.
Only use URLs that appear in imageCandidates / groupedReferences.`,
    variablesSchema: {
      type: 'object',
      properties: {
        season: { type: 'string' },
        category: { type: 'string' },
        market: { type: 'string' },
        imageCandidates: { type: 'array' },
        groupedReferences: { type: 'array' },
      },
      required: ['season', 'category', 'market'],
    },
    wireAgentCode: 'fashion-inspiration-organizer',
  },
  {
    code: 'fashion-color-analyzer-prompt',
    name: 'Fashion Color Analyzer',
    description: 'Analyze color direction from kids fashion inspiration',
    category: 'kids-fashion',
    tags: ['fashion', 'style-analysis', 'milestone-2'],
    template: `Analyze color direction for kids fashion.

Season: {{season}}
Category: {{category}}
Market: {{market}}
Age band: {{ageBand}}
Constraints: {{constraints}}
Inspiration board: {{inspirationBoard}}
Grouped references: {{groupedReferences}}
Image candidates: {{imageCandidates}}

Return colorAnalysis as { summary, findings[] } where each finding is { label, notes? }.
Do not write styleReport — that belongs to the illustration/report step.`,
    variablesSchema: {
      type: 'object',
      properties: {
        season: { type: 'string' },
        category: { type: 'string' },
        market: { type: 'string' },
        ageBand: { type: 'string' },
        constraints: { type: 'string' },
        inspirationBoard: { type: 'object' },
        groupedReferences: { type: 'array' },
        imageCandidates: { type: 'array' },
      },
      required: ['season', 'category', 'market'],
    },
    wireAgentCode: 'fashion-color-analyzer',
  },
  {
    code: 'fashion-style-analyzer-prompt',
    name: 'Fashion Style Analyzer',
    description: 'Analyze silhouettes and aesthetics for kids fashion',
    category: 'kids-fashion',
    tags: ['fashion', 'style-analysis', 'milestone-2'],
    template: `Analyze style cues for kids fashion.

Season: {{season}}
Category: {{category}}
Market: {{market}}
Color analysis: {{colorAnalysis}}
Inspiration board: {{inspirationBoard}}
Grouped references: {{groupedReferences}}

Return styleAnalysis as { summary, findings[] } where each finding is { label, notes? }.
Do not write styleReport.`,
    variablesSchema: {
      type: 'object',
      properties: {
        season: { type: 'string' },
        category: { type: 'string' },
        market: { type: 'string' },
        colorAnalysis: { type: 'object' },
        inspirationBoard: { type: 'object' },
        groupedReferences: { type: 'array' },
      },
      required: ['season', 'category', 'market'],
    },
    wireAgentCode: 'fashion-style-analyzer',
  },
  {
    code: 'fashion-pattern-analyzer-prompt',
    name: 'Fashion Pattern Analyzer',
    description: 'Analyze print and pattern motifs for kids fashion',
    category: 'kids-fashion',
    tags: ['fashion', 'style-analysis', 'milestone-2'],
    template: `Analyze pattern motifs for kids fashion.

Season: {{season}}
Category: {{category}}
Market: {{market}}
Color analysis: {{colorAnalysis}}
Style analysis: {{styleAnalysis}}
Inspiration board: {{inspirationBoard}}

Return patternAnalysis as { summary, findings[] } where each finding is { label, notes? }.
Do not write styleReport.`,
    variablesSchema: {
      type: 'object',
      properties: {
        season: { type: 'string' },
        category: { type: 'string' },
        market: { type: 'string' },
        colorAnalysis: { type: 'object' },
        styleAnalysis: { type: 'object' },
        inspirationBoard: { type: 'object' },
      },
      required: ['season', 'category', 'market'],
    },
    wireAgentCode: 'fashion-pattern-analyzer',
  },
  {
    code: 'fashion-illustration-analyzer-prompt',
    name: 'Fashion Illustration Analyzer',
    description: 'Synthesize kids fashion style report',
    category: 'kids-fashion',
    tags: ['fashion', 'style-analysis', 'milestone-2'],
    template: `Synthesize a style report for kids fashion.

Season: {{season}}
Category: {{category}}
Market: {{market}}
Color analysis: {{colorAnalysis}}
Style analysis: {{styleAnalysis}}
Pattern analysis: {{patternAnalysis}}
Inspiration board: {{inspirationBoard}}

Return EXACTLY this JSON shape (arrays of labeled notes — not nested summary/findings objects):
{
  "styleReport": {
    "summary": "<non-empty string>",
    "colors": [ { "label": "<string>", "notes": "<string>" } ],
    "styles": [ { "label": "<string>", "notes": "<string>" } ],
    "patterns": [ { "label": "<string>", "notes": "<string>" } ],
    "illustrationNotes": [ { "label": "<string>", "notes": "<string>" } ],
    "recommendations": [ { "label": "<string>", "notes": "<string>" } ]
  }
}
Use [] for empty lists — never null. Do not wrap lists as { "summary", "findings" }.`,
    variablesSchema: {
      type: 'object',
      properties: {
        season: { type: 'string' },
        category: { type: 'string' },
        market: { type: 'string' },
        colorAnalysis: { type: 'object' },
        styleAnalysis: { type: 'object' },
        patternAnalysis: { type: 'object' },
        inspirationBoard: { type: 'object' },
      },
      required: ['season', 'category', 'market'],
    },
    wireAgentCode: 'fashion-illustration-analyzer',
  },
  {
    code: 'fashion-design-brief-writer-prompt',
    name: 'Fashion Design Brief Writer',
    description: 'Generate kids fashion design brief',
    category: 'kids-fashion',
    tags: ['fashion', 'design-brief', 'milestone-2'],
    template: `Write a design brief for kids fashion.

Season: {{season}}
Category: {{category}}
Market: {{market}}
Age band: {{ageBand}}
Constraints: {{constraints}}
Style report: {{styleReport}}
Color analysis: {{colorAnalysis}}
Style analysis: {{styleAnalysis}}
Pattern analysis: {{patternAnalysis}}

Return designBrief as { summary, themes[], mustHaves[], avoid[] }.
Each list item must be { label, notes? }.
Do not write designSpecification — that belongs to the specification step.
Do not add extra free-text narrative fields beyond summary.`,
    variablesSchema: {
      type: 'object',
      properties: {
        season: { type: 'string' },
        category: { type: 'string' },
        market: { type: 'string' },
        ageBand: { type: 'string' },
        constraints: { type: 'string' },
        styleReport: { type: 'object' },
        colorAnalysis: { type: 'object' },
        styleAnalysis: { type: 'object' },
        patternAnalysis: { type: 'object' },
      },
      required: ['season', 'category', 'market'],
    },
    wireAgentCode: 'fashion-design-brief-writer',
  },
  {
    code: 'fashion-design-spec-writer-prompt',
    name: 'Fashion Design Spec Writer',
    description: 'Generate kids fashion design specification',
    category: 'kids-fashion',
    tags: ['fashion', 'design-brief', 'milestone-2'],
    template: `Write a design specification for kids fashion from the design brief.

Season: {{season}}
Category: {{category}}
Market: {{market}}
Design brief: {{designBrief}}
Style report: {{styleReport}}
Color analysis: {{colorAnalysis}}
Style analysis: {{styleAnalysis}}
Pattern analysis: {{patternAnalysis}}

designBrief is required input from the prior step.
Return designSpecification as {
  summary, objectives[], constraints[], colorDirection[],
  styleDirection[], patternDirection[], deliverables[]
}.
Each list item must be { label, notes? }.
Do not rewrite designBrief.`,
    variablesSchema: {
      type: 'object',
      properties: {
        season: { type: 'string' },
        category: { type: 'string' },
        market: { type: 'string' },
        designBrief: { type: 'object' },
        styleReport: { type: 'object' },
        colorAnalysis: { type: 'object' },
        styleAnalysis: { type: 'object' },
        patternAnalysis: { type: 'object' },
      },
      required: ['season', 'category', 'market', 'designBrief'],
    },
    wireAgentCode: 'fashion-design-spec-writer',
  },
  {
    code: 'fashion-image-prompt-prep-prompt',
    name: 'Fashion Image Prompt Prep',
    description: 'Prepare image generation prompts from design brief',
    category: 'kids-fashion',
    tags: ['fashion', 'image-generation', 'milestone-2'],
    template: `Prepare image generation prompts for kids fashion.

Season: {{season}}
Category: {{category}}
Market: {{market}}
Age band: {{ageBand}}
Constraints: {{constraints}}
Design brief: {{designBrief}}
Design specification: {{designSpecification}}

Return imageGenPrompts as { summary, prompts[] }.
Each prompt item must be { id, label, text } where text is the full prompt string.
Default demo expects exactly 2 prompts.
Do not write rawGenerations or generatedImages.`,
    variablesSchema: {
      type: 'object',
      properties: {
        season: { type: 'string' },
        category: { type: 'string' },
        market: { type: 'string' },
        ageBand: { type: 'string' },
        constraints: { type: 'string' },
        designBrief: { type: 'object' },
        designSpecification: { type: 'object' },
      },
      required: ['season', 'category', 'market', 'designBrief', 'designSpecification'],
    },
    wireAgentCode: 'fashion-image-prompt-prep',
  },
  {
    code: 'fashion-image-generator-prompt',
    name: 'Fashion Image Generator',
    description: 'Generate artwork variations from prepared prompts',
    category: 'kids-fashion',
    tags: ['fashion', 'image-generation', 'milestone-2'],
    template: `Generate kids fashion artwork variations.

Season: {{season}}
Category: {{category}}
Market: {{market}}
Image gen prompts: {{imageGenPrompts}}
Design brief: {{designBrief}}
Design specification: {{designSpecification}}

imageGenPrompts is required input from the prior step.
Return rawGenerations as an array of { id, label, promptRef?, assetUrl?, notes? }.
Default demo expects exactly 2 variation drafts.
promptRef is optional; when set it SHOULD match a prompts[].id.
Do not write generatedImages — that belongs to the organize step.`,
    variablesSchema: {
      type: 'object',
      properties: {
        season: { type: 'string' },
        category: { type: 'string' },
        market: { type: 'string' },
        imageGenPrompts: { type: 'object' },
        designBrief: { type: 'object' },
        designSpecification: { type: 'object' },
      },
      required: ['season', 'category', 'market', 'imageGenPrompts'],
    },
    wireAgentCode: 'fashion-image-generator',
  },
  {
    code: 'fashion-image-organizer-prompt',
    name: 'Fashion Image Organizer',
    description: 'Organize generated variations for Design Review handoff',
    category: 'kids-fashion',
    tags: ['fashion', 'image-generation', 'milestone-2'],
    template: `Organize generated kids fashion artwork for Design Review.

Season: {{season}}
Category: {{category}}
Market: {{market}}
Raw generations: {{rawGenerations}}
Image gen prompts: {{imageGenPrompts}}

rawGenerations is required input from the prior step.
Return generatedImages as { summary, variations[] }.
Each variation must be { id, label, promptRef?, assetUrl?, notes? }.
Default demo expects exactly 2 variations.
Do not rewrite rawGenerations.`,
    variablesSchema: {
      type: 'object',
      properties: {
        season: { type: 'string' },
        category: { type: 'string' },
        market: { type: 'string' },
        rawGenerations: { type: 'array' },
        imageGenPrompts: { type: 'object' },
      },
      required: ['season', 'category', 'market', 'rawGenerations'],
    },
    wireAgentCode: 'fashion-image-organizer',
  },
  {
    code: 'fashion-quality-reviewer-prompt',
    name: 'Fashion Quality Reviewer',
    description: 'Review quality of generated artwork variations',
    category: 'kids-fashion',
    tags: ['fashion', 'design-review', 'milestone-2'],
    template: `Review quality of kids fashion artwork variations.

Season: {{season}}
Category: {{category}}
Market: {{market}}
Age band: {{ageBand}}
Constraints: {{constraints}}
Generated images: {{generatedImages}}
Design brief: {{designBrief}}
Design specification: {{designSpecification}}

generatedImages is required input from Image Generation handoff.
Return qualityReview as { summary, findings[] }.
Each finding must be { id, label, severity?, variationRef?, notes? }.
severity is optional free-text (no enum).
Do not write improvementSuggestions or designReviewScore.`,
    variablesSchema: {
      type: 'object',
      properties: {
        season: { type: 'string' },
        category: { type: 'string' },
        market: { type: 'string' },
        ageBand: { type: 'string' },
        constraints: { type: 'string' },
        generatedImages: { type: 'object' },
        designBrief: { type: 'object' },
        designSpecification: { type: 'object' },
      },
      required: ['season', 'category', 'market', 'generatedImages'],
    },
    wireAgentCode: 'fashion-quality-reviewer',
  },
  {
    code: 'fashion-improvement-suggester-prompt',
    name: 'Fashion Improvement Suggester',
    description: 'Produce improvement suggestions from quality review',
    category: 'kids-fashion',
    tags: ['fashion', 'design-review', 'milestone-2'],
    template: `Produce improvement suggestions for kids fashion artwork.

Season: {{season}}
Category: {{category}}
Market: {{market}}
Quality review: {{qualityReview}}
Generated images: {{generatedImages}}

qualityReview is required input from the prior step.
Return improvementSuggestions as { summary, suggestions[] }.
Each suggestion must be { id, label, priority?, variationRef?, notes? }.
Do not write designReviewScore.`,
    variablesSchema: {
      type: 'object',
      properties: {
        season: { type: 'string' },
        category: { type: 'string' },
        market: { type: 'string' },
        qualityReview: { type: 'object' },
        generatedImages: { type: 'object' },
      },
      required: ['season', 'category', 'market', 'qualityReview'],
    },
    wireAgentCode: 'fashion-improvement-suggester',
  },
  {
    code: 'fashion-design-scorer-prompt',
    name: 'Fashion Design Scorer',
    description: 'Assign final design review score',
    category: 'kids-fashion',
    tags: ['fashion', 'design-review', 'milestone-2'],
    template: `Assign a final design review score for kids fashion artwork.

Season: {{season}}
Category: {{category}}
Market: {{market}}
Quality review: {{qualityReview}}
Improvement suggestions: {{improvementSuggestions}}
Generated images: {{generatedImages}}

qualityReview and improvementSuggestions are required inputs from prior steps.
Return designReviewScore as { summary, overallScore (0-100), perVariation?, criteria?, notes? }.
Default demo expects perVariation with exactly 2 entries ({ variationRef, score, notes? }).
Do not rewrite qualityReview or improvementSuggestions.`,
    variablesSchema: {
      type: 'object',
      properties: {
        season: { type: 'string' },
        category: { type: 'string' },
        market: { type: 'string' },
        qualityReview: { type: 'object' },
        improvementSuggestions: { type: 'object' },
        generatedImages: { type: 'object' },
      },
      required: ['season', 'category', 'market', 'qualityReview', 'improvementSuggestions'],
    },
    wireAgentCode: 'fashion-design-scorer',
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

  const jsonOnlySuffix = `

IMPORTANT: Respond with a single JSON object only (no markdown, no prose outside JSON).
The JSON object MUST match the Agent output contract keys for this step.`;

  for (const sample of SAMPLE_PROMPTS) {
    const template =
      sample.category === 'kids-fashion'
        ? `${sample.template.trim()}${jsonOnlySuffix}`
        : sample.template;

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
          template,
          messages: null,
          variablesSchema: sample.variablesSchema,
          modelHints: { temperature: 0.7 },
          changelog: 'Initial published version',
          publishedAt: new Date(),
          createdBy: null,
        }),
      );
    } else {
      version.status = PromptVersionStatus.PUBLISHED;
      version.publishedAt = version.publishedAt ?? new Date();
      version.template = template;
      version.variablesSchema = sample.variablesSchema;
      version.modelHints = version.modelHints ?? { temperature: 0.7 };
      await versionRepo.save(version);
    }

    console.log(`Sample prompt ready: ${sample.code}`);

    if (sample.wireAgentCode) {
      const agent = await agentRepo.findOne({ where: { code: sample.wireAgentCode } });
      if (agent) {
        const agentVersion = await agentVersionRepo.findOne({
          where: { agentId: agent.id, version: agent.currentVersion ?? 1 },
        });
        if (agentVersion && agentVersion.promptRef !== sample.code) {
          agentVersion.promptRef = sample.code;
          await agentVersionRepo.save(agentVersion);
          console.log(`Wired ${sample.wireAgentCode} promptRef → ${sample.code}`);
        }
      }
    }
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
