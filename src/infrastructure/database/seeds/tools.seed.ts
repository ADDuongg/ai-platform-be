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
}> = [
  {
    code: 'web-search',
    name: 'Web Search',
    description: 'Stub search tool for research workflows',
    toolType: ToolType.SEARCH,
  },
  {
    code: 'web-browser',
    name: 'Web Browser',
    description: 'Stub browser tool for page fetch/navigation',
    toolType: ToolType.BROWSER,
  },
  {
    code: 'image-generation',
    name: 'Image Generation',
    description: 'Stub image generation tool',
    toolType: ToolType.IMAGE_GENERATION,
  },
  {
    code: 'object-storage',
    name: 'Object Storage',
    description: 'Stub storage tool for artifacts',
    toolType: ToolType.STORAGE,
  },
];

const AGENT_TOOL_WIRING: Array<{ agentCode: string; toolCode: string }> = [
  { agentCode: 'research-agent', toolCode: 'web-search' },
  { agentCode: 'review-agent', toolCode: 'object-storage' },
  { agentCode: 'fashion-trend-research', toolCode: 'web-search' },
  { agentCode: 'fashion-reference-collector', toolCode: 'web-search' },
  { agentCode: 'fashion-image-search', toolCode: 'web-search' },
  { agentCode: 'fashion-image-search', toolCode: 'web-browser' },
  { agentCode: 'fashion-color-analyzer', toolCode: 'web-browser' },
  { agentCode: 'fashion-style-analyzer', toolCode: 'web-browser' },
  { agentCode: 'fashion-pattern-analyzer', toolCode: 'web-browser' },
  { agentCode: 'fashion-image-generator', toolCode: 'image-generation' },
  { agentCode: 'fashion-image-organizer', toolCode: 'object-storage' },
  { agentCode: 'fashion-design-scorer', toolCode: 'object-storage' },
];

function configForTool(code: string): Record<string, unknown> {
  switch (code) {
    case 'web-search':
      return { provider: 'duckduckgo', maxResults: 5 };
    case 'web-browser':
      return { provider: 'native-fetch', maxBytes: 262144 };
    case 'image-generation':
      return { provider: 'stub-live' };
    case 'object-storage':
      return { provider: 'filesystem', rootEnv: 'TOOL_STORAGE_ROOT' };
    default:
      return { provider: 'stub-live' };
  }
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

    if (!version) {
      await versionRepo.save(
        versionRepo.create({
          toolId: tool.id,
          version: 1,
          status: ToolVersionStatus.PUBLISHED,
          configJson: configForTool(sample.code),
          inputSchema: { type: 'object' },
          outputSchema: { type: 'object' },
          secretRef: null,
          timeoutMs: 30_000,
          maxRetries: 1,
          changelog: 'Initial published free/local tool config',
          publishedAt: new Date(),
          createdBy: null,
        }),
      );
    } else {
      version.status = ToolVersionStatus.PUBLISHED;
      version.publishedAt = version.publishedAt ?? new Date();
      version.configJson = configForTool(sample.code);
      version.timeoutMs = version.timeoutMs ?? 30_000;
      version.maxRetries = version.maxRetries ?? 1;
      await versionRepo.save(version);
    }

    console.log(`Sample tool ready: ${sample.code}`);
  }

  for (const wire of AGENT_TOOL_WIRING) {
    const agent = await agentRepo.findOne({ where: { code: wire.agentCode } });
    if (!agent) continue;

    const agentVersion = await agentVersionRepo.findOne({
      where: { agentId: agent.id, version: agent.currentVersion ?? 1 },
    });
    if (!agentVersion) continue;

    const refs = Array.isArray(agentVersion.toolRefs) ? [...agentVersion.toolRefs] : [];
    if (!refs.includes(wire.toolCode)) {
      refs.push(wire.toolCode);
      agentVersion.toolRefs = refs;
      await agentVersionRepo.save(agentVersion);
      console.log(`Wired ${wire.agentCode} toolRefs → +${wire.toolCode}`);
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
