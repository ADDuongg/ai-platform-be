import { AgentEntity } from '@modules/agents/entities/agent.entity';
import { AgentVersionEntity } from '@modules/agents/entities/agent-version.entity';
import { AgentStatus, AgentVersionStatus, CapabilityType } from '@modules/agents/enums';

import AppDataSource from '../data-source';

const SAMPLE_SCHEMA = { type: 'object' } as const;

/** Non-trivial output contracts for live Ollama JSON validation (008–013). */
const FASHION_OUTPUT_SCHEMAS: Record<string, Record<string, unknown>> = {
  'fashion-trend-research': {
    type: 'object',
    required: ['trendFindings'],
    properties: {
      trendFindings: {
        type: 'object',
        required: ['summary', 'trends'],
        properties: {
          summary: { type: 'string' },
          trends: { type: 'array' },
        },
      },
    },
  },
  'fashion-reference-collector': {
    type: 'object',
    required: ['references'],
    properties: {
      references: { type: 'array' },
    },
  },
  'fashion-research-report': {
    type: 'object',
    required: ['researchReport'],
    properties: {
      researchReport: {
        type: 'object',
        required: ['summary', 'trends', 'references', 'gaps'],
        properties: {
          summary: { type: 'string' },
          trends: { type: 'array' },
          references: { type: 'array' },
          gaps: { type: 'array' },
        },
      },
    },
  },
  'fashion-image-search': {
    type: 'object',
    required: ['imageCandidates'],
    properties: { imageCandidates: { type: 'array' } },
  },
  'fashion-reference-grouper': {
    type: 'object',
    required: ['groupedReferences'],
    properties: { groupedReferences: { type: 'array' } },
  },
  'fashion-inspiration-organizer': {
    type: 'object',
    required: ['inspirationBoard'],
    properties: {
      inspirationBoard: {
        type: 'object',
        required: ['summary', 'groups', 'references', 'notes'],
        properties: {
          summary: { type: 'string' },
          groups: { type: 'array' },
          references: { type: 'array' },
          notes: { type: 'array' },
        },
      },
    },
  },
  'fashion-color-analyzer': {
    type: 'object',
    required: ['colorAnalysis'],
    properties: { colorAnalysis: { type: 'object' } },
  },
  'fashion-style-analyzer': {
    type: 'object',
    required: ['styleAnalysis'],
    properties: { styleAnalysis: { type: 'object' } },
  },
  'fashion-pattern-analyzer': {
    type: 'object',
    required: ['patternAnalysis'],
    properties: { patternAnalysis: { type: 'object' } },
  },
  'fashion-illustration-analyzer': {
    type: 'object',
    required: ['styleReport'],
    properties: {
      styleReport: {
        type: 'object',
        required: [
          'summary',
          'colors',
          'styles',
          'patterns',
          'illustrationNotes',
          'recommendations',
        ],
        properties: {
          summary: { type: 'string' },
          colors: { type: 'array' },
          styles: { type: 'array' },
          patterns: { type: 'array' },
          illustrationNotes: { type: 'array' },
          recommendations: { type: 'array' },
        },
      },
    },
  },
  'fashion-design-brief-writer': {
    type: 'object',
    required: ['designBrief'],
    properties: {
      designBrief: {
        type: 'object',
        required: ['summary', 'themes', 'mustHaves', 'avoid'],
        properties: {
          summary: { type: 'string' },
          themes: { type: 'array' },
          mustHaves: { type: 'array' },
          avoid: { type: 'array' },
        },
      },
    },
  },
  'fashion-design-spec-writer': {
    type: 'object',
    required: ['designSpecification'],
    properties: {
      designSpecification: {
        type: 'object',
        required: [
          'summary',
          'objectives',
          'constraints',
          'colorDirection',
          'styleDirection',
          'patternDirection',
          'deliverables',
        ],
        properties: {
          summary: { type: 'string' },
          objectives: { type: 'array' },
          constraints: { type: 'array' },
          colorDirection: { type: 'array' },
          styleDirection: { type: 'array' },
          patternDirection: { type: 'array' },
          deliverables: { type: 'array' },
        },
      },
    },
  },
  'fashion-image-prompt-prep': {
    type: 'object',
    required: ['imageGenPrompts'],
    properties: {
      imageGenPrompts: {
        type: 'object',
        required: ['summary', 'prompts'],
        properties: {
          summary: { type: 'string' },
          prompts: { type: 'array' },
        },
      },
    },
  },
  'fashion-image-generator': {
    type: 'object',
    required: ['rawGenerations'],
    properties: { rawGenerations: { type: 'array' } },
  },
  'fashion-image-organizer': {
    type: 'object',
    required: ['generatedImages'],
    properties: {
      generatedImages: {
        type: 'object',
        required: ['summary', 'variations'],
        properties: {
          summary: { type: 'string' },
          variations: { type: 'array' },
        },
      },
    },
  },
  'fashion-quality-reviewer': {
    type: 'object',
    required: ['qualityReview'],
    properties: {
      qualityReview: {
        type: 'object',
        required: ['summary', 'findings'],
        properties: {
          summary: { type: 'string' },
          findings: { type: 'array' },
        },
      },
    },
  },
  'fashion-improvement-suggester': {
    type: 'object',
    required: ['improvementSuggestions'],
    properties: {
      improvementSuggestions: {
        type: 'object',
        required: ['summary', 'suggestions'],
        properties: {
          summary: { type: 'string' },
          suggestions: { type: 'array' },
        },
      },
    },
  },
  'fashion-design-scorer': {
    type: 'object',
    required: ['designReviewScore'],
    properties: {
      designReviewScore: {
        type: 'object',
        required: ['summary', 'overallScore'],
        properties: {
          summary: { type: 'string' },
          overallScore: { type: 'number' },
        },
      },
    },
  },
};

const SAMPLE_AGENTS: Array<{
  code: string;
  name: string;
  description: string;
  capabilityType: CapabilityType;
}> = [
  {
    code: 'research-agent',
    name: 'Research',
    description: 'Sample research capability for Workflow demos',
    capabilityType: CapabilityType.RESEARCH,
  },
  {
    code: 'review-agent',
    name: 'Review',
    description: 'Sample review capability for Workflow demos',
    capabilityType: CapabilityType.REVIEW,
  },
  {
    code: 'fashion-trend-research',
    name: 'Fashion Trend Research',
    description: 'Kids fashion trend signals for Milestone 2 Trend Research Workflow',
    capabilityType: CapabilityType.RESEARCH,
  },
  {
    code: 'fashion-reference-collector',
    name: 'Fashion Reference Collector',
    description: 'Collect textual/URL references for kids fashion research',
    capabilityType: CapabilityType.RESEARCH,
  },
  {
    code: 'fashion-research-report',
    name: 'Fashion Research Report',
    description: 'Synthesize structured kids fashion research report',
    capabilityType: CapabilityType.ANALYSIS,
  },
  {
    code: 'fashion-image-search',
    name: 'Fashion Image Search',
    description: 'Search visual reference candidates for kids fashion inspiration',
    capabilityType: CapabilityType.RESEARCH,
  },
  {
    code: 'fashion-reference-grouper',
    name: 'Fashion Reference Grouper',
    description: 'Group visual references by theme/style for kids fashion',
    capabilityType: CapabilityType.ANALYSIS,
  },
  {
    code: 'fashion-inspiration-organizer',
    name: 'Fashion Inspiration Organizer',
    description: 'Organize inspiration board from grouped kids fashion references',
    capabilityType: CapabilityType.ANALYSIS,
  },
  {
    code: 'fashion-color-analyzer',
    name: 'Fashion Color Analyzer',
    description: 'Analyze color direction from kids fashion inspiration references',
    capabilityType: CapabilityType.ANALYSIS,
  },
  {
    code: 'fashion-style-analyzer',
    name: 'Fashion Style Analyzer',
    description: 'Analyze silhouettes and aesthetics for kids fashion',
    capabilityType: CapabilityType.ANALYSIS,
  },
  {
    code: 'fashion-pattern-analyzer',
    name: 'Fashion Pattern Analyzer',
    description: 'Analyze print and pattern motifs for kids fashion',
    capabilityType: CapabilityType.ANALYSIS,
  },
  {
    code: 'fashion-illustration-analyzer',
    name: 'Fashion Illustration Analyzer',
    description: 'Synthesize style report from color, style, and pattern analysis',
    capabilityType: CapabilityType.ANALYSIS,
  },
  {
    code: 'fashion-design-brief-writer',
    name: 'Fashion Design Brief Writer',
    description: 'Generate kids fashion design brief from style analysis signals',
    capabilityType: CapabilityType.GENERATION,
  },
  {
    code: 'fashion-design-spec-writer',
    name: 'Fashion Design Spec Writer',
    description: 'Generate kids fashion design specification from design brief',
    capabilityType: CapabilityType.GENERATION,
  },
  {
    code: 'fashion-image-prompt-prep',
    name: 'Fashion Image Prompt Prep',
    description: 'Prepare image generation prompts from design brief and specification',
    capabilityType: CapabilityType.GENERATION,
  },
  {
    code: 'fashion-image-generator',
    name: 'Fashion Image Generator',
    description: 'Generate kids fashion artwork variations from prepared prompts',
    capabilityType: CapabilityType.GENERATION,
  },
  {
    code: 'fashion-image-organizer',
    name: 'Fashion Image Organizer',
    description: 'Organize generated artwork variations for Design Review handoff',
    capabilityType: CapabilityType.ANALYSIS,
  },
  {
    code: 'fashion-quality-reviewer',
    name: 'Fashion Quality Reviewer',
    description: 'Review quality of generated kids fashion artwork variations',
    capabilityType: CapabilityType.ANALYSIS,
  },
  {
    code: 'fashion-improvement-suggester',
    name: 'Fashion Improvement Suggester',
    description: 'Produce improvement suggestions from quality review findings',
    capabilityType: CapabilityType.ANALYSIS,
  },
  {
    code: 'fashion-design-scorer',
    name: 'Fashion Design Scorer',
    description: 'Assign final design review score from quality review and suggestions',
    capabilityType: CapabilityType.ANALYSIS,
  },
];

export async function seedAgents(): Promise<void> {
  const startedHere = !AppDataSource.isInitialized;
  if (startedHere) {
    await AppDataSource.initialize();
  }

  const agentRepo = AppDataSource.getRepository(AgentEntity);
  const versionRepo = AppDataSource.getRepository(AgentVersionEntity);

  for (const sample of SAMPLE_AGENTS) {
    let agent = await agentRepo.findOne({
      where: { code: sample.code },
      withDeleted: true,
    });

    if (!agent) {
      agent = await agentRepo.save(
        agentRepo.create({
          code: sample.code,
          name: sample.name,
          description: sample.description,
          capabilityType: sample.capabilityType,
          status: AgentStatus.PUBLISHED,
          enabled: true,
          currentVersion: 1,
          createdBy: null,
        }),
      );
    } else {
      if (agent.deletedAt) {
        await agentRepo.recover(agent);
      }
      agent.name = sample.name;
      agent.description = sample.description;
      agent.capabilityType = sample.capabilityType;
      agent.status = AgentStatus.PUBLISHED;
      agent.enabled = true;
      agent.currentVersion = agent.currentVersion ?? 1;
      agent.deletedAt = null;
      await agentRepo.save(agent);
    }

    const version = await versionRepo.findOne({
      where: { agentId: agent.id, version: 1 },
    });

    const outputSchema = FASHION_OUTPUT_SCHEMAS[sample.code]
      ? { ...FASHION_OUTPUT_SCHEMAS[sample.code] }
      : { ...SAMPLE_SCHEMA };

    if (!version) {
      await versionRepo.save(
        versionRepo.create({
          agentId: agent.id,
          version: 1,
          status: AgentVersionStatus.PUBLISHED,
          inputSchema: { ...SAMPLE_SCHEMA },
          outputSchema,
          configJson: {},
          timeoutMs: 60_000,
          maxRetries: 0,
          promptRef: null,
          toolRefs: [],
          changelog: 'Seeded sample agent',
          publishedAt: new Date(),
          createdBy: null,
        }),
      );
    } else {
      version.status = AgentVersionStatus.PUBLISHED;
      version.publishedAt = version.publishedAt ?? new Date();
      version.inputSchema = version.inputSchema ?? { ...SAMPLE_SCHEMA };
      if (FASHION_OUTPUT_SCHEMAS[sample.code]) {
        version.outputSchema = outputSchema;
      } else {
        version.outputSchema = version.outputSchema ?? { ...SAMPLE_SCHEMA };
      }
      await versionRepo.save(version);
    }

    console.log(`Sample agent ready: ${sample.code}`);
  }

  console.log('Agents seed completed');

  if (startedHere) {
    await AppDataSource.destroy();
  }
}

if (require.main === module) {
  seedAgents().catch(async (error: unknown) => {
    console.error('Agents seed failed', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  });
}
