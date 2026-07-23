import { WorkflowEntity } from '@modules/workflows/entities/workflow.entity';
import { WorkflowVersionEntity } from '@modules/workflows/entities/workflow-version.entity';
import { WorkflowStatus, WorkflowVersionStatus } from '@modules/workflows/enums';
import type { WorkflowDefinition } from '@modules/workflows/types';

import AppDataSource from '../data-source';

/**
 * Kids Fashion MVP: research → style analysis → FLUX image generation.
 * Start fields → context; node mappings wire Agent I/O (see CONTEXT_MAPPING_3NODE_PIPELINE.md).
 */
const KIDS_FASHION_RESEARCH_TO_IMAGE: WorkflowDefinition = {
  nodes: [
    {
      id: 'node-research',
      type: 'agent',
      agentCode: 'fashion-trend-research',
      label: 'Trend Research',
      position: { x: 80, y: 160 },
      inputMapping: {
        season: 'season',
        category: 'category',
        market: 'market',
        ageBand: 'ageBand',
        constraints: 'constraints',
      },
      outputMapping: {
        trendFindings: 'trendFindings',
      },
    },
    {
      id: 'node-analysis',
      type: 'agent',
      agentCode: 'fashion-style-analysis',
      label: 'Style Analysis',
      position: { x: 360, y: 160 },
      inputMapping: {
        season: 'season',
        category: 'category',
        market: 'market',
        ageBand: 'ageBand',
        constraints: 'constraints',
        trendFindings: 'trendFindings',
      },
      outputMapping: {
        styleReport: 'styleReport',
        imagePrompt: 'imagePrompt',
      },
    },
    {
      id: 'node-image-gen',
      type: 'agent',
      agentCode: 'fashion-image-generator',
      label: 'Image Generation',
      position: { x: 640, y: 160 },
      // Single FLUX call per run; portrait 4:5 for kids apparel (tee/hoodie).
      inputMapping: {
        prompt: 'imagePrompt',
        season: 'season',
        category: 'category',
        market: 'market',
        styleReport: 'styleReport',
        width: 1024,
        height: 1280,
      },
      outputMapping: {
        rawGenerations: 'rawGenerations',
      },
    },
  ],
  edges: [
    {
      id: 'edge-research-analysis',
      from: 'node-research',
      to: 'node-analysis',
      condition: null,
    },
    {
      id: 'edge-analysis-image',
      from: 'node-analysis',
      to: 'node-image-gen',
      condition: null,
    },
  ],
  variables: {},
  policies: {
    requiredInputs: ['season', 'category', 'market'],
    inputSchema: {
      season: {
        label: 'Season',
        widget: 'text',
        placeholder: 'e.g. SS27',
        default: 'SS27',
      },
      category: {
        label: 'Category',
        widget: 'select',
        options: ['tees', 'hoodies', 'dresses', 'sets', 'outerwear'],
        default: 'tees',
      },
      market: {
        label: 'Market',
        widget: 'select',
        options: ['EU', 'US', 'JP', 'SEA'],
        default: 'EU',
      },
      ageBand: {
        label: 'Age band',
        widget: 'select',
        options: ['2-4', '4-8', '8-12'],
        default: '4-8',
      },
      constraints: {
        label: 'Constraints (JSON)',
        widget: 'textarea',
        placeholder: '{"mustAvoid":["neon overload","adult logos"],"notes":"school-friendly"}',
        default:
          '{"mustAvoid":["neon overload","harsh neon","brand logos","readable trademarks","licensed characters"],"notes":"school-friendly, age-appropriate"}',
      },
    },
    outputs: [
      {
        key: 'rawGenerations',
        kind: 'image_set',
        label: 'Generated looks',
        persist: 'blob',
      },
    ],
  },
};

/** Small Builder UI smoke (draft) — research → review */
const SAMPLE_BUILDER_DEMO_DEFINITION: WorkflowDefinition = {
  nodes: [
    {
      id: 'node-research',
      type: 'agent',
      agentCode: 'research-agent',
      label: 'Research',
      inputMapping: {
        topic: 'topic',
        audience: 'audience',
      },
      outputMapping: { research: 'result' },
    },
    {
      id: 'node-review',
      type: 'agent',
      agentCode: 'review-agent',
      label: 'Review',
      inputMapping: { research: 'research' },
      outputMapping: { review: 'result' },
    },
  ],
  edges: [
    {
      id: 'edge-research-review',
      from: 'node-research',
      to: 'node-review',
      condition: null,
    },
  ],
  variables: {},
  policies: {
    requiredInputs: ['topic', 'audience'],
    inputSchema: {
      topic: {
        label: 'Topic',
        widget: 'text',
        placeholder: 'e.g. summer kids streetwear',
        default: 'summer kids streetwear',
      },
      audience: {
        label: 'Audience',
        widget: 'select',
        options: ['kids', 'teens', 'adults'],
        default: 'kids',
      },
    },
  },
};

const SAMPLE_WORKFLOWS: Array<{
  code: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  definition: WorkflowDefinition;
  status: WorkflowStatus;
  versionStatus: WorkflowVersionStatus;
}> = [
  {
    code: 'kids-fashion-research-to-image',
    name: 'Kids Fashion — Research → Analysis → Image',
    description:
      'Published MVP: research → analysis (one visual FLUX prompt + hard constraints) → one FLUX.2 Pro image at 1024×1280 (4:5)',
    category: 'kids-fashion',
    tags: ['kids-fashion', 'mvp', 'flux', 'image-generation', 'portrait-4-5'],
    definition: KIDS_FASHION_RESEARCH_TO_IMAGE,
    status: WorkflowStatus.PUBLISHED,
    versionStatus: WorkflowVersionStatus.PUBLISHED,
  },
  {
    code: 'sample-builder-demo',
    name: 'Sample Builder Demo',
    description: 'Draft demo — research→review with start inputs (Builder UX smoke)',
    category: 'demo',
    tags: ['demo', 'sample', 'builder'],
    definition: SAMPLE_BUILDER_DEMO_DEFINITION,
    status: WorkflowStatus.DRAFT,
    versionStatus: WorkflowVersionStatus.DRAFT,
  },
];

export async function seedWorkflows(): Promise<void> {
  const startedHere = !AppDataSource.isInitialized;
  if (startedHere) {
    await AppDataSource.initialize();
  }

  const workflowRepo = AppDataSource.getRepository(WorkflowEntity);
  const versionRepo = AppDataSource.getRepository(WorkflowVersionEntity);

  for (const sample of SAMPLE_WORKFLOWS) {
    let workflow = await workflowRepo.findOne({
      where: { code: sample.code },
      withDeleted: true,
    });

    if (!workflow) {
      workflow = await workflowRepo.save(
        workflowRepo.create({
          code: sample.code,
          name: sample.name,
          description: sample.description,
          category: sample.category,
          tags: sample.tags,
          status: sample.status,
          currentVersion: sample.versionStatus === WorkflowVersionStatus.PUBLISHED ? 1 : null,
          createdBy: null,
        }),
      );
    } else {
      if (workflow.deletedAt) {
        await workflowRepo.recover(workflow);
      }
      workflow.name = sample.name;
      workflow.description = sample.description;
      workflow.category = sample.category;
      workflow.tags = sample.tags;
      workflow.status = sample.status;
      workflow.currentVersion =
        sample.versionStatus === WorkflowVersionStatus.PUBLISHED
          ? (workflow.currentVersion ?? 1)
          : null;
      workflow.deletedAt = null;
      await workflowRepo.save(workflow);
    }

    const version = await versionRepo.findOne({
      where: { workflowId: workflow.id, version: 1 },
    });

    const publishedAt =
      sample.versionStatus === WorkflowVersionStatus.PUBLISHED ? new Date() : null;

    if (!version) {
      await versionRepo.save(
        versionRepo.create({
          workflowId: workflow.id,
          version: 1,
          status: sample.versionStatus,
          definitionJson: sample.definition,
          changelog: 'Seeded workflow v1',
          publishedAt,
          createdBy: null,
        }),
      );
    } else {
      version.status = sample.versionStatus;
      version.publishedAt =
        sample.versionStatus === WorkflowVersionStatus.PUBLISHED
          ? (version.publishedAt ?? publishedAt)
          : null;
      version.definitionJson = sample.definition;
      await versionRepo.save(version);
    }

    console.log(`Sample workflow ready: ${sample.code} (${sample.status}/${sample.versionStatus})`);
  }

  console.log('Workflows seed completed');

  if (startedHere) {
    await AppDataSource.destroy();
  }
}

if (require.main === module) {
  seedWorkflows().catch(async (error: unknown) => {
    console.error('Workflows seed failed', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  });
}
