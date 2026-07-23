import { ToolEntity } from '@modules/tools/entities/tool.entity';
import { ToolVersionEntity } from '@modules/tools/entities/tool-version.entity';
import { ToolStatus, ToolType, ToolVersionStatus } from '@modules/tools/enums';
import { AgentVersionEntity } from '@modules/agents/entities/agent-version.entity';
import { AgentEntity } from '@modules/agents/entities/agent.entity';

import AppDataSource from '../data-source';

const SAMPLE_TOOLS: Array<{
  code: string;
  name: string;
  description: string;
  toolType: ToolType;
  timeoutMs: number;
}> = [
  {
    code: 'web-search',
    name: 'Web Search',
    description: 'Search enrichment for trend research',
    toolType: ToolType.SEARCH,
    timeoutMs: 30_000,
  },
  {
    code: 'image-generation',
    name: 'Image Generation (FLUX.2 Pro)',
    description: 'BFL FLUX.2 Pro via TOOL_RUNTIME=live + FLUX_API_KEY',
    toolType: ToolType.IMAGE_GENERATION,
    timeoutMs: 180_000,
  },
];

const AGENT_TOOL_WIRING: Array<{ agentCode: string; toolCode: string }> = [
  { agentCode: 'fashion-trend-research', toolCode: 'web-search' },
  { agentCode: 'fashion-image-generator', toolCode: 'image-generation' },
];

function configForTool(code: string): Record<string, unknown> {
  switch (code) {
    case 'web-search':
      return {
        providers: ['serpapi', 'tavily'],
        provider: 'serpapi',
        fallbackProvider: 'duckduckgo',
        engine: 'google_shopping',
        searchDepth: 'basic',
        fetchLimit: 50,
        maxInputItems: 20,
        perBucket: 5,
        kindMix: { shopping: 10, article: 10 },
        // Domain-specific queries live in config (not adapter code).
        // Tokens {{season}} / {{category}} / {{market}} come from agent step input.
        queryTemplates: [
          'kids fashion trends {{season}} {{category}} {{market}}',
          'children clothing trends {{market}} {{season}}',
          'kids apparel fashion {{market}} {{season}}',
        ],
      };
    case 'image-generation':
      // Live Flux when TOOL_RUNTIME=live and FLUX_API_KEY / BFL_API_KEY set.
      // Adapter falls back to stub-live if provider is not "flux".
      return {
        provider: 'flux',
        // Portrait 4:5 default for kids apparel (workflow also maps width/height).
        defaultWidth: 1024,
        defaultHeight: 1280,
        maxImagesPerInvoke: 1,
      };
    default:
      return { provider: 'stub-live' };
  }
}

function schemasForTool(code: string): {
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
} {
  if (code === 'image-generation') {
    return {
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string' },
          imagePrompt: { type: 'string' },
          width: { type: 'number' },
          height: { type: 'number' },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          provider: { type: 'string' },
          assetUrl: { type: 'string' },
          promptEcho: { type: 'string' },
          width: { type: 'number' },
          height: { type: 'number' },
        },
      },
    };
  }
  return {
    inputSchema: { type: 'object' },
    outputSchema: { type: 'object' },
  };
}

export async function seedTools(): Promise<void> {
  const startedHere = !AppDataSource.isInitialized;
  if (startedHere) {
    await AppDataSource.initialize();
  }

  const toolRepo = AppDataSource.getRepository(ToolEntity);
  const versionRepo = AppDataSource.getRepository(ToolVersionEntity);
  const agentRepo = AppDataSource.getRepository(AgentEntity);
  const agentVersionRepo = AppDataSource.getRepository(AgentVersionEntity);

  for (const sample of SAMPLE_TOOLS) {
    let tool = await toolRepo.findOne({ where: { code: sample.code } });

    if (!tool) {
      tool = await toolRepo.save(
        toolRepo.create({
          code: sample.code,
          name: sample.name,
          description: sample.description,
          toolType: sample.toolType,
          status: ToolStatus.PUBLISHED,
          enabled: true,
          currentVersion: 1,
          createdBy: null,
        }),
      );
    } else {
      tool.name = sample.name;
      tool.description = sample.description;
      tool.toolType = sample.toolType;
      tool.status = ToolStatus.PUBLISHED;
      tool.enabled = true;
      tool.currentVersion = tool.currentVersion ?? 1;
      await toolRepo.save(tool);
    }

    const version = await versionRepo.findOne({
      where: { toolId: tool.id, version: 1 },
    });

    const schemas = schemasForTool(sample.code);

    if (!version) {
      await versionRepo.save(
        versionRepo.create({
          toolId: tool.id,
          version: 1,
          status: ToolVersionStatus.PUBLISHED,
          configJson: configForTool(sample.code),
          inputSchema: schemas.inputSchema,
          outputSchema: schemas.outputSchema,
          secretRef: null,
          timeoutMs: sample.timeoutMs,
          maxRetries: 0,
          changelog: 'Seeded tool v1',
          publishedAt: new Date(),
          createdBy: null,
        }),
      );
    } else {
      version.status = ToolVersionStatus.PUBLISHED;
      version.configJson = configForTool(sample.code);
      version.inputSchema = schemas.inputSchema;
      version.outputSchema = schemas.outputSchema;
      version.timeoutMs = sample.timeoutMs;
      version.publishedAt = version.publishedAt ?? new Date();
      await versionRepo.save(version);
    }

    console.log(`Sample tool ready: ${sample.code}`);
  }

  for (const wire of AGENT_TOOL_WIRING) {
    const agent = await agentRepo.findOne({ where: { code: wire.agentCode } });
    if (!agent?.currentVersion) {
      continue;
    }
    const agentVersion = await agentVersionRepo.findOne({
      where: { agentId: agent.id, version: agent.currentVersion },
    });
    if (!agentVersion) {
      continue;
    }
    const refs = Array.isArray(agentVersion.toolRefs) ? [...agentVersion.toolRefs] : [];
    if (!refs.includes(wire.toolCode)) {
      refs.push(wire.toolCode);
      agentVersion.toolRefs = refs;
      await agentVersionRepo.save(agentVersion);
      console.log(`Wired ${wire.agentCode} toolRefs → ${wire.toolCode}`);
    }
  }

  console.log('Tools seed completed');

  if (startedHere) {
    await AppDataSource.destroy();
  }
}

if (require.main === module) {
  seedTools().catch(async (error: unknown) => {
    console.error('Tools seed failed', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  });
}
