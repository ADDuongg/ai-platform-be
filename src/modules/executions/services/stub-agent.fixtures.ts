import type { AgentRunnerInvokeInput } from './agent-runner.types';

const FASHION_TREND_RESEARCH = 'fashion-trend-research';
const FASHION_REFERENCE_COLLECTOR = 'fashion-reference-collector';
const FASHION_RESEARCH_REPORT = 'fashion-research-report';
const FASHION_IMAGE_SEARCH = 'fashion-image-search';
const FASHION_REFERENCE_GROUPER = 'fashion-reference-grouper';
const FASHION_INSPIRATION_ORGANIZER = 'fashion-inspiration-organizer';
const FASHION_COLOR_ANALYZER = 'fashion-color-analyzer';
const FASHION_STYLE_ANALYZER = 'fashion-style-analyzer';
const FASHION_PATTERN_ANALYZER = 'fashion-pattern-analyzer';
const FASHION_ILLUSTRATION_ANALYZER = 'fashion-illustration-analyzer';
const FASHION_DESIGN_BRIEF_WRITER = 'fashion-design-brief-writer';
const FASHION_DESIGN_SPEC_WRITER = 'fashion-design-spec-writer';
const FASHION_IMAGE_PROMPT_PREP = 'fashion-image-prompt-prep';
const FASHION_IMAGE_GENERATOR = 'fashion-image-generator';
const FASHION_IMAGE_ORGANIZER = 'fashion-image-organizer';
const FASHION_QUALITY_REVIEWER = 'fashion-quality-reviewer';
const FASHION_IMPROVEMENT_SUGGESTER = 'fashion-improvement-suggester';
const FASHION_DESIGN_SCORER = 'fashion-design-scorer';

export function resolveFashionFixture(
  params: AgentRunnerInvokeInput,
): Record<string, unknown> | null {
  const season = String(params.input.season ?? 'SS27');
  const category = String(params.input.category ?? 'kids-apparel');
  const market = String(params.input.market ?? 'VN');

  if (params.agentCode === FASHION_TREND_RESEARCH) {
    const trendFindings = {
      summary: `Trend signals for ${category} ${season} in ${market}`,
      trends: [
        {
          name: 'Playful color blocking',
          confidence: 0.82,
          notes: 'Strong in kids apparel references for school + play',
        },
        {
          name: 'Soft technical fabrics',
          confidence: 0.74,
          notes: 'Comfort-first silhouettes',
        },
      ],
    };
    return {
      ...params.input,
      _agent: params.agentCode,
      _agentVersion: params.agentVersion,
      _nodeId: params.nodeId,
      trendFindings,
      result: trendFindings,
    };
  }

  if (params.agentCode === FASHION_REFERENCE_COLLECTOR) {
    const references = [
      {
        title: `${season} kids color stories — editorial board`,
        url: 'https://example.com/refs/kids-color-stories',
        notes: 'Palette inspiration for playful blocking',
      },
      {
        title: 'Soft-tech kids outerwear lookbook',
        url: 'https://example.com/refs/soft-tech-outerwear',
        notes: 'Fabric hand-feel references',
      },
    ];
    return {
      ...params.input,
      _agent: params.agentCode,
      _agentVersion: params.agentVersion,
      _nodeId: params.nodeId,
      references,
      result: references,
    };
  }

  if (params.agentCode === FASHION_RESEARCH_REPORT) {
    const trendFindings = params.input.trendFindings as
      { summary?: string; trends?: unknown[] } | undefined;
    const references = Array.isArray(params.input.references) ? params.input.references : [];
    const trends = Array.isArray(trendFindings?.trends) ? trendFindings.trends : [];
    const researchReport = {
      summary: trendFindings?.summary ?? `Research report for ${category} ${season} (${market})`,
      trends,
      references,
      gaps: [
        'Live market price benchmarks not collected in stub mode',
        'Image moodboard deferred to Reference Image Workflow',
      ],
    };
    return {
      ...params.input,
      _agent: params.agentCode,
      _agentVersion: params.agentVersion,
      _nodeId: params.nodeId,
      researchReport,
      result: researchReport,
    };
  }

  if (params.agentCode === FASHION_IMAGE_SEARCH) {
    const imageCandidates = [
      {
        title: `${season} playful color-block tee — mood`,
        url: 'https://example.com/images/color-block-tee',
        thumbnailUrl: 'https://example.com/thumbs/color-block-tee.jpg',
        notes: 'Strong primary blocking for school + play',
      },
      {
        title: 'Soft-tech kids cargo — fabric detail',
        url: 'https://example.com/images/soft-tech-cargo',
        thumbnailUrl: 'https://example.com/thumbs/soft-tech-cargo.jpg',
        notes: 'Comfort hand-feel reference',
      },
      {
        title: `${market} kids street mix — editorial`,
        url: 'https://example.com/images/kids-street-mix',
        thumbnailUrl: 'https://example.com/thumbs/kids-street-mix.jpg',
        notes: `Market-local silhouette cues (${category})`,
      },
    ];
    return {
      ...params.input,
      _agent: params.agentCode,
      _agentVersion: params.agentVersion,
      _nodeId: params.nodeId,
      imageCandidates,
      result: imageCandidates,
    };
  }

  if (params.agentCode === FASHION_REFERENCE_GROUPER) {
    const candidates = Array.isArray(params.input.imageCandidates)
      ? (params.input.imageCandidates as Array<Record<string, unknown>>)
      : [];
    const colorItems = candidates.filter((_, i) => i % 2 === 0);
    const fabricItems = candidates.filter((_, i) => i % 2 === 1);
    const groupedReferences = [
      {
        group: 'Color & print',
        items:
          colorItems.length > 0
            ? colorItems
            : [
                {
                  title: 'Playful color blocking mood',
                  url: 'https://example.com/images/color-block-tee',
                },
              ],
      },
      {
        group: 'Silhouette & fabric',
        items:
          fabricItems.length > 0
            ? fabricItems
            : [
                {
                  title: 'Soft-tech fabric detail',
                  url: 'https://example.com/images/soft-tech-cargo',
                },
              ],
      },
    ];
    return {
      ...params.input,
      _agent: params.agentCode,
      _agentVersion: params.agentVersion,
      _nodeId: params.nodeId,
      groupedReferences,
      result: groupedReferences,
    };
  }

  if (params.agentCode === FASHION_INSPIRATION_ORGANIZER) {
    const grouped = Array.isArray(params.input.groupedReferences)
      ? (params.input.groupedReferences as Array<{
          group?: string;
          items?: unknown[];
        }>)
      : [];
    const candidates = Array.isArray(params.input.imageCandidates)
      ? (params.input.imageCandidates as unknown[])
      : [];
    const flatRefs = grouped.flatMap((g) => (Array.isArray(g.items) ? g.items : []));
    const inspirationBoard = {
      summary: `Inspiration board for ${category} ${season} (${market})`,
      groups: grouped.length > 0 ? grouped : [],
      references: flatRefs.length > 0 ? flatRefs : candidates,
      notes: [
        'Stub mode — visual pointers only; no binary assets stored',
        'Ready for Style Analysis Workflow handoff',
      ],
    };
    return {
      ...params.input,
      _agent: params.agentCode,
      _agentVersion: params.agentVersion,
      _nodeId: params.nodeId,
      inspirationBoard,
      result: inspirationBoard,
    };
  }

  if (params.agentCode === FASHION_COLOR_ANALYZER) {
    const colorAnalysis = {
      summary: `Color direction for ${category} ${season} (${market})`,
      findings: [
        {
          label: 'Soft pastel blue',
          notes: 'Primary playful accent for school + play',
        },
        {
          label: 'Warm cream base',
          notes: 'Neutral ground for color blocking',
        },
      ],
    };
    return {
      ...params.input,
      _agent: params.agentCode,
      _agentVersion: params.agentVersion,
      _nodeId: params.nodeId,
      colorAnalysis,
      result: colorAnalysis,
    };
  }

  if (params.agentCode === FASHION_STYLE_ANALYZER) {
    const styleAnalysis = {
      summary: `Style cues for ${category} ${season} (${market})`,
      findings: [
        {
          label: 'Relaxed silhouette',
          notes: 'Age-appropriate room for movement',
        },
        {
          label: 'Playful school-ready aesthetic',
          notes: 'Balances fun color with everyday wearability',
        },
      ],
    };
    return {
      ...params.input,
      _agent: params.agentCode,
      _agentVersion: params.agentVersion,
      _nodeId: params.nodeId,
      styleAnalysis,
      result: styleAnalysis,
    };
  }

  if (params.agentCode === FASHION_PATTERN_ANALYZER) {
    const patternAnalysis = {
      summary: `Pattern motifs for ${category} ${season} (${market})`,
      findings: [
        {
          label: 'Soft geometric blocks',
          notes: 'Large-scale color blocks, low visual noise',
        },
        {
          label: 'Subtle micro-dot accents',
          notes: 'Secondary interest without clutter',
        },
      ],
    };
    return {
      ...params.input,
      _agent: params.agentCode,
      _agentVersion: params.agentVersion,
      _nodeId: params.nodeId,
      patternAnalysis,
      result: patternAnalysis,
    };
  }

  if (params.agentCode === FASHION_ILLUSTRATION_ANALYZER) {
    const colorAnalysis = params.input.colorAnalysis as
      { summary?: string; findings?: Array<{ label?: string; notes?: string }> } | undefined;
    const styleAnalysis = params.input.styleAnalysis as
      { findings?: Array<{ label?: string; notes?: string }> } | undefined;
    const patternAnalysis = params.input.patternAnalysis as
      { findings?: Array<{ label?: string; notes?: string }> } | undefined;

    const toLabeled = (
      items: Array<{ label?: string; notes?: string }> | undefined,
      fallback: { label: string; notes?: string },
    ) => {
      const mapped = (items ?? [])
        .filter((i) => typeof i.label === 'string' && i.label.trim() !== '')
        .map((i) => ({
          label: String(i.label),
          ...(i.notes ? { notes: String(i.notes) } : {}),
        }));
      return mapped.length > 0 ? mapped : [fallback];
    };

    const styleReport = {
      summary: colorAnalysis?.summary ?? `Style report for ${category} ${season} (${market})`,
      colors: toLabeled(colorAnalysis?.findings, {
        label: 'Soft pastel blue',
        notes: 'Primary playful accent',
      }),
      styles: toLabeled(styleAnalysis?.findings, {
        label: 'Relaxed silhouette',
        notes: 'School + play ready',
      }),
      patterns: toLabeled(patternAnalysis?.findings, {
        label: 'Soft geometric blocks',
        notes: 'Large-scale, low noise',
      }),
      illustrationNotes: [
        {
          label: 'Clean flat illustration language',
          notes: 'Stub mode — metadata synthesis only; no vision decode',
        },
      ],
      recommendations: [
        {
          label: 'Carry color-block tee + soft cargo into Design Brief',
          notes: 'Align palette with cream base and pastel accents',
        },
      ],
    };
    return {
      ...params.input,
      _agent: params.agentCode,
      _agentVersion: params.agentVersion,
      _nodeId: params.nodeId,
      styleReport,
      result: styleReport,
    };
  }

  if (params.agentCode === FASHION_DESIGN_BRIEF_WRITER) {
    const styleReport = params.input.styleReport as { summary?: string } | undefined;
    const designBrief = {
      summary: styleReport?.summary ?? `Design brief for ${category} ${season} (${market})`,
      themes: [
        {
          label: 'Playful color blocking',
          notes: 'School + play ready visual story',
        },
        {
          label: 'Soft comfort silhouettes',
          notes: 'Age-appropriate movement',
        },
      ],
      mustHaves: [
        {
          label: 'Warm cream base with pastel accents',
          notes: 'Carry Style Analysis palette forward',
        },
      ],
      avoid: [
        {
          label: 'Harsh neon overload',
          notes: 'Keep kid-friendly, low visual noise',
        },
      ],
    };
    return {
      ...params.input,
      _agent: params.agentCode,
      _agentVersion: params.agentVersion,
      _nodeId: params.nodeId,
      designBrief,
      result: designBrief,
    };
  }

  if (params.agentCode === FASHION_DESIGN_SPEC_WRITER) {
    const designBrief = params.input.designBrief as
      | {
          summary?: string;
          themes?: Array<{ label?: string; notes?: string }>;
          mustHaves?: Array<{ label?: string; notes?: string }>;
          avoid?: Array<{ label?: string; notes?: string }>;
        }
      | undefined;

    const toLabeled = (
      items: Array<{ label?: string; notes?: string }> | undefined,
      fallback: { label: string; notes?: string },
    ) => {
      const mapped = (items ?? [])
        .filter((i) => typeof i.label === 'string' && i.label.trim() !== '')
        .map((i) => ({
          label: String(i.label),
          ...(i.notes ? { notes: String(i.notes) } : {}),
        }));
      return mapped.length > 0 ? mapped : [fallback];
    };

    const designSpecification = {
      summary: designBrief?.summary ?? `Design specification for ${category} ${season} (${market})`,
      objectives: toLabeled(designBrief?.themes, {
        label: 'Deliver playful color-block kids apparel concept',
        notes: 'Ready for Image Generation',
      }),
      constraints: toLabeled(designBrief?.avoid, {
        label: 'Avoid harsh neon overload',
        notes: 'Keep age-appropriate',
      }),
      colorDirection: toLabeled(designBrief?.mustHaves, {
        label: 'Warm cream base with pastel accents',
        notes: 'Primary palette direction',
      }),
      styleDirection: [
        {
          label: 'Relaxed silhouette',
          notes: 'School + play ready',
        },
      ],
      patternDirection: [
        {
          label: 'Soft geometric blocks',
          notes: 'Large-scale, low noise',
        },
      ],
      deliverables: [
        {
          label: 'Hero artwork concept for Image Generation',
          notes: 'Stub mode — structured handoff only',
        },
      ],
    };
    return {
      ...params.input,
      _agent: params.agentCode,
      _agentVersion: params.agentVersion,
      _nodeId: params.nodeId,
      designSpecification,
      result: designSpecification,
    };
  }

  if (params.agentCode === FASHION_IMAGE_PROMPT_PREP) {
    const designBrief = params.input.designBrief as { summary?: string } | undefined;
    const designSpecification = params.input.designSpecification as
      { summary?: string } | undefined;
    const imageGenPrompts = {
      summary:
        designBrief?.summary ??
        designSpecification?.summary ??
        `Image generation prompts for ${category} ${season} (${market})`,
      prompts: [
        {
          id: 'prompt-var-1',
          label: 'Hero color-block tee',
          text: `Kids ${category} ${season} ${market}: playful color-block tee, cream base, pastel accents, school-friendly`,
        },
        {
          id: 'prompt-var-2',
          label: 'Soft cargo companion look',
          text: `Kids ${category} ${season} ${market}: relaxed soft cargo silhouette, geometric block accents, age-appropriate`,
        },
      ],
    };
    return {
      ...params.input,
      _agent: params.agentCode,
      _agentVersion: params.agentVersion,
      _nodeId: params.nodeId,
      imageGenPrompts,
      result: imageGenPrompts,
    };
  }

  if (params.agentCode === FASHION_IMAGE_GENERATOR) {
    const prompts = params.input.imageGenPrompts as
      | {
          prompts?: Array<{ id?: string; label?: string; text?: string }>;
        }
      | undefined;
    const p1 = prompts?.prompts?.[0];
    const p2 = prompts?.prompts?.[1];
    const rawGenerations = [
      {
        id: 'gen-var-1',
        label: p1?.label ?? 'Hero color-block tee',
        promptRef: p1?.id ?? 'prompt-var-1',
        assetUrl: 'stub://image-generation/kids-ss27-var-1.png',
        notes: 'Stub mode — metadata only; no live image provider',
      },
      {
        id: 'gen-var-2',
        label: p2?.label ?? 'Soft cargo companion look',
        promptRef: p2?.id ?? 'prompt-var-2',
        assetUrl: 'stub://image-generation/kids-ss27-var-2.png',
        notes: 'Stub mode — second variation for Design Review handoff',
      },
    ];
    return {
      ...params.input,
      _agent: params.agentCode,
      _agentVersion: params.agentVersion,
      _nodeId: params.nodeId,
      rawGenerations,
      result: rawGenerations,
    };
  }

  if (params.agentCode === FASHION_IMAGE_ORGANIZER) {
    const raw = Array.isArray(params.input.rawGenerations)
      ? (params.input.rawGenerations as Array<{
          id?: string;
          label?: string;
          promptRef?: string;
          assetUrl?: string;
          notes?: string;
        }>)
      : [];
    const toVariation = (
      item: {
        id?: string;
        label?: string;
        promptRef?: string;
        assetUrl?: string;
        notes?: string;
      },
      index: number,
    ) => ({
      id: item.id ?? `gen-var-${index + 1}`,
      label: item.label ?? `Variation ${index + 1}`,
      ...(item.promptRef ? { promptRef: String(item.promptRef) } : {}),
      ...(item.assetUrl ? { assetUrl: String(item.assetUrl) } : {}),
      ...(item.notes ? { notes: String(item.notes) } : {}),
    });
    const variations =
      raw.length >= 2
        ? [toVariation(raw[0], 0), toVariation(raw[1], 1)]
        : [
            {
              id: 'gen-var-1',
              label: 'Hero color-block tee',
              promptRef: 'prompt-var-1',
              assetUrl: 'stub://image-generation/kids-ss27-var-1.png',
              notes: 'Stub fallback variation 1',
            },
            {
              id: 'gen-var-2',
              label: 'Soft cargo companion look',
              promptRef: 'prompt-var-2',
              assetUrl: 'stub://image-generation/kids-ss27-var-2.png',
              notes: 'Stub fallback variation 2',
            },
          ];
    const generatedImages = {
      summary: `Generated artwork variations for ${category} ${season} (${market})`,
      variations,
    };
    return {
      ...params.input,
      _agent: params.agentCode,
      _agentVersion: params.agentVersion,
      _nodeId: params.nodeId,
      generatedImages,
      result: generatedImages,
    };
  }

  if (params.agentCode === FASHION_QUALITY_REVIEWER) {
    const generatedImages = params.input.generatedImages as
      | {
          summary?: string;
          variations?: Array<{ id?: string; label?: string }>;
        }
      | undefined;
    const v1 = generatedImages?.variations?.[0];
    const v2 = generatedImages?.variations?.[1];
    const qualityReview = {
      summary: generatedImages?.summary ?? `Quality review for ${category} ${season} (${market})`,
      findings: [
        {
          id: 'finding-1',
          label: 'Color balance fits brief',
          severity: 'info',
          variationRef: v1?.id ?? 'var-1',
          notes: 'Cream base and pastel accents read age-appropriate',
        },
        {
          id: 'finding-2',
          label: 'Silhouette clarity could improve',
          severity: 'warning',
          variationRef: v2?.id ?? 'var-2',
          notes: 'Soft cargo blocks slightly busy at small scale',
        },
      ],
    };
    return {
      ...params.input,
      _agent: params.agentCode,
      _agentVersion: params.agentVersion,
      _nodeId: params.nodeId,
      qualityReview,
      result: qualityReview,
    };
  }

  if (params.agentCode === FASHION_IMPROVEMENT_SUGGESTER) {
    const qualityReview = params.input.qualityReview as
      | {
          findings?: Array<{
            id?: string;
            label?: string;
            variationRef?: string;
          }>;
        }
      | undefined;
    const f2 = qualityReview?.findings?.[1];
    const improvementSuggestions = {
      summary: `Improvement suggestions for ${category} ${season} (${market})`,
      suggestions: [
        {
          id: 'suggest-1',
          label: 'Simplify secondary block layout',
          priority: 'medium',
          variationRef: f2?.variationRef ?? 'var-2',
          notes: 'Reduce geometric density on small sizes',
        },
        {
          id: 'suggest-2',
          label: 'Keep hero tee as primary candidate',
          priority: 'high',
          variationRef: qualityReview?.findings?.[0]?.variationRef ?? 'var-1',
          notes: 'Strongest school-friendly color story',
        },
      ],
    };
    return {
      ...params.input,
      _agent: params.agentCode,
      _agentVersion: params.agentVersion,
      _nodeId: params.nodeId,
      improvementSuggestions,
      result: improvementSuggestions,
    };
  }

  if (params.agentCode === FASHION_DESIGN_SCORER) {
    const generatedImages = params.input.generatedImages as
      | {
          variations?: Array<{ id?: string; label?: string }>;
        }
      | undefined;
    const qualityReview = params.input.qualityReview as { summary?: string } | undefined;
    const improvementSuggestions = params.input.improvementSuggestions as
      { summary?: string } | undefined;
    const v1 = generatedImages?.variations?.[0];
    const v2 = generatedImages?.variations?.[1];
    const designReviewScore = {
      summary:
        qualityReview?.summary ??
        improvementSuggestions?.summary ??
        `Design review score for ${category} ${season} (${market})`,
      overallScore: 82,
      perVariation: [
        {
          variationRef: v1?.id ?? 'var-1',
          score: 86,
          notes: 'Strong primary candidate',
        },
        {
          variationRef: v2?.id ?? 'var-2',
          score: 78,
          notes: 'Viable with layout simplification',
        },
      ],
      criteria: [
        { id: 'crit-color', label: 'Color direction', score: 88 },
        { id: 'crit-silhouette', label: 'Silhouette clarity', score: 76 },
      ],
      notes: ['Stub scorer — metadata only; no live vision model', 'Milestone 2 terminal artifact'],
    };
    return {
      ...params.input,
      _agent: params.agentCode,
      _agentVersion: params.agentVersion,
      _nodeId: params.nodeId,
      designReviewScore,
      result: designReviewScore,
    };
  }

  return null;
}
