import { AgentEntity } from '@modules/agents/entities/agent.entity';
import { AgentVersionEntity } from '@modules/agents/entities/agent-version.entity';
import { AgentStatus, AgentVersionStatus, CapabilityType } from '@modules/agents/enums';

import AppDataSource from '../data-source';

type SampleAgent = {
  code: string;
  name: string;
  description: string;
  capabilityType: CapabilityType;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  timeoutMs: number;
  toolRefs: string[];
  /** LLM only — image pixels still come from tool `image-generation` (FLUX). */
  configJson: Record<string, unknown>;
};

const stringProp = { type: 'string' } as const;

/** All seeded agents use Ollama for chat/JSON; FLUX is only via image-generation tool. */
const OLLAMA_AGENT_CONFIG: Record<string, unknown> = {
  provider: 'ollama',
  model: process.env.OLLAMA_MODEL?.trim() || 'llama3.2',
};

/**
 * Kids Fashion MVP agents: research → analysis → image generation.
 * promptRef / toolRefs are wired by prompts.seed / tools.seed after agents exist.
 */
const SAMPLE_AGENTS: SampleAgent[] = [
  {
    code: 'fashion-trend-research',
    name: 'Fashion Trend Research',
    description: 'Researches kids-fashion trends from season/category/market start inputs (Ollama)',
    capabilityType: CapabilityType.RESEARCH,
    timeoutMs: 120_000,
    toolRefs: ['web-search'],
    configJson: { ...OLLAMA_AGENT_CONFIG },
    inputSchema: {
      type: 'object',
      required: ['season', 'category', 'market'],
      properties: {
        season: stringProp,
        category: stringProp,
        market: stringProp,
        ageBand: stringProp,
        constraints: { type: 'object' },
      },
    },
    outputSchema: {
      type: 'object',
      required: ['trendFindings'],
      properties: {
        trendFindings: {
          type: 'object',
          required: ['summary', 'trends'],
          properties: {
            summary: stringProp,
            trends: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name', 'confidence', 'notes', 'evidence'],
                properties: {
                  name: stringProp,
                  confidence: { type: 'number' },
                  notes: stringProp,
                  evidence: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['title', 'url', 'quote'],
                      properties: {
                        title: stringProp,
                        url: stringProp,
                        quote: stringProp,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  {
    code: 'fashion-style-analysis',
    name: 'Fashion Style Analysis',
    description: 'Turns trend findings into a style report + one photographic FLUX.2 Pro imagePrompt (constraints baked in)',
    capabilityType: CapabilityType.ANALYSIS,
    timeoutMs: 120_000,
    toolRefs: [],
    configJson: { ...OLLAMA_AGENT_CONFIG },
    inputSchema: {
      type: 'object',
      required: ['season', 'category', 'market', 'trendFindings'],
      properties: {
        season: stringProp,
        category: stringProp,
        market: stringProp,
        ageBand: stringProp,
        constraints: { type: 'object' },
        trendFindings: { type: 'object' },
      },
    },
    outputSchema: {
      type: 'object',
      required: ['styleReport', 'imagePrompt'],
      properties: {
        styleReport: {
          type: 'object',
          required: ['summary', 'colorDirection', 'silhouette', 'mustHaves', 'avoid'],
          properties: {
            summary: stringProp,
            colorDirection: stringProp,
            silhouette: stringProp,
            mustHaves: { type: 'array', items: stringProp },
            avoid: { type: 'array', items: stringProp },
          },
        },
        imagePrompt: {
          type: 'string',
          description: 'Single photographic prompt for FLUX.2 Pro (English, detailed)',
        },
      },
    },
  },
  {
    code: 'fashion-image-generator',
    name: 'Fashion Image Generator',
    description:
      'Ollama packages FLUX tool result; pixels from image-generation (FLUX.2 Pro 1024×1280)',
    capabilityType: CapabilityType.GENERATION,
    timeoutMs: 180_000,
    toolRefs: ['image-generation'],
    configJson: { ...OLLAMA_AGENT_CONFIG },
    inputSchema: {
      type: 'object',
      required: ['prompt'],
      properties: {
        prompt: stringProp,
        season: stringProp,
        category: stringProp,
        market: stringProp,
        styleReport: { type: 'object' },
        width: { type: 'number' },
        height: { type: 'number' },
      },
    },
    outputSchema: {
      type: 'object',
      required: ['rawGenerations'],
      properties: {
        rawGenerations: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'assetUrl'],
            properties: {
              id: stringProp,
              label: stringProp,
              assetUrl: stringProp,
              promptEcho: stringProp,
              notes: stringProp,
            },
          },
        },
      },
    },
  },
  // Lightweight Builder demo pair (optional UI smoke)
  {
    code: 'research-agent',
    name: 'Research',
    description: 'Sample research capability for Builder demos (Ollama)',
    capabilityType: CapabilityType.RESEARCH,
    timeoutMs: 60_000,
    toolRefs: [],
    configJson: { ...OLLAMA_AGENT_CONFIG },
    inputSchema: {
      type: 'object',
      required: ['topic'],
      properties: {
        topic: stringProp,
        audience: stringProp,
      },
    },
    outputSchema: {
      type: 'object',
      required: ['result'],
      properties: { result: stringProp },
    },
  },
  {
    code: 'review-agent',
    name: 'Review',
    description: 'Sample review capability for Builder demos (Ollama)',
    capabilityType: CapabilityType.REVIEW,
    timeoutMs: 60_000,
    toolRefs: [],
    configJson: { ...OLLAMA_AGENT_CONFIG },
    inputSchema: {
      type: 'object',
      required: ['research'],
      properties: { research: stringProp },
    },
    outputSchema: {
      type: 'object',
      required: ['result'],
      properties: { result: stringProp },
    },
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

    if (!version) {
      await versionRepo.save(
        versionRepo.create({
          agentId: agent.id,
          version: 1,
          status: AgentVersionStatus.PUBLISHED,
          inputSchema: sample.inputSchema,
          outputSchema: sample.outputSchema,
          configJson: sample.configJson,
          timeoutMs: sample.timeoutMs,
          maxRetries: 0,
          promptRef: null,
          toolRefs: sample.toolRefs,
          changelog: 'Seeded agent v1 (Ollama LLM; FLUX via image-generation tool only)',
          publishedAt: new Date(),
          createdBy: null,
        }),
      );
    } else {
      version.status = AgentVersionStatus.PUBLISHED;
      version.publishedAt = version.publishedAt ?? new Date();
      version.inputSchema = sample.inputSchema;
      version.outputSchema = sample.outputSchema;
      version.configJson = sample.configJson;
      version.timeoutMs = sample.timeoutMs;
      version.maxRetries = 0;
      // Preserve promptRef if already wired by prompts seed in same run order;
      // tools seed merges toolRefs — reset to seed baseline then tools seed adds.
      version.toolRefs = sample.toolRefs;
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
