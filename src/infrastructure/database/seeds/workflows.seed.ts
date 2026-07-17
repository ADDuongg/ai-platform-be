import { WorkflowEntity } from '@modules/workflows/entities/workflow.entity';
import { WorkflowVersionEntity } from '@modules/workflows/entities/workflow-version.entity';
import { WorkflowStatus, WorkflowVersionStatus } from '@modules/workflows/enums';
import { EMPTY_WORKFLOW_DEFINITION } from '@modules/workflows/services/workflows.service';
import type { WorkflowDefinition } from '@modules/workflows/types';

import AppDataSource from '../data-source';

const RESEARCH_REVIEW_DEFINITION: WorkflowDefinition = {
  nodes: [
    {
      id: 'node-research',
      type: 'agent',
      agentCode: 'research-agent',
      label: 'Research',
      inputMapping: { topic: 'topic' },
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
  policies: {},
};

const TREND_RESEARCH_DEFINITION: WorkflowDefinition = {
  nodes: [
    {
      id: 'node-trend-research',
      type: 'agent',
      agentCode: 'fashion-trend-research',
      label: 'Research trends',
      inputMapping: {
        season: 'season',
        category: 'category',
        market: 'market',
        ageBand: 'ageBand',
        constraints: 'constraints',
      },
      outputMapping: { trendFindings: 'trendFindings' },
    },
    {
      id: 'node-collect-references',
      type: 'agent',
      agentCode: 'fashion-reference-collector',
      label: 'Collect references',
      inputMapping: {
        season: 'season',
        category: 'category',
        market: 'market',
        trendFindings: 'trendFindings',
      },
      outputMapping: { references: 'references' },
    },
    {
      id: 'node-research-report',
      type: 'agent',
      agentCode: 'fashion-research-report',
      label: 'Generate research report',
      inputMapping: {
        season: 'season',
        category: 'category',
        market: 'market',
        trendFindings: 'trendFindings',
        references: 'references',
      },
      outputMapping: { researchReport: 'researchReport' },
    },
  ],
  edges: [
    {
      id: 'edge-research-refs',
      from: 'node-trend-research',
      to: 'node-collect-references',
      condition: null,
    },
    {
      id: 'edge-refs-report',
      from: 'node-collect-references',
      to: 'node-research-report',
      condition: null,
    },
  ],
  variables: {},
  policies: {
    requiredInputs: ['season', 'category', 'market'],
  },
};

const REFERENCE_IMAGE_DEFINITION: WorkflowDefinition = {
  nodes: [
    {
      id: 'node-image-search',
      type: 'agent',
      agentCode: 'fashion-image-search',
      label: 'Search images',
      inputMapping: {
        season: 'season',
        category: 'category',
        market: 'market',
        ageBand: 'ageBand',
        constraints: 'constraints',
        researchReport: 'researchReport',
        references: 'references',
        trendFindings: 'trendFindings',
      },
      outputMapping: { imageCandidates: 'imageCandidates' },
    },
    {
      id: 'node-group-references',
      type: 'agent',
      agentCode: 'fashion-reference-grouper',
      label: 'Group references',
      inputMapping: {
        season: 'season',
        category: 'category',
        market: 'market',
        imageCandidates: 'imageCandidates',
        researchReport: 'researchReport',
      },
      outputMapping: { groupedReferences: 'groupedReferences' },
    },
    {
      id: 'node-organize-inspiration',
      type: 'agent',
      agentCode: 'fashion-inspiration-organizer',
      label: 'Organize inspiration',
      inputMapping: {
        season: 'season',
        category: 'category',
        market: 'market',
        imageCandidates: 'imageCandidates',
        groupedReferences: 'groupedReferences',
      },
      outputMapping: { inspirationBoard: 'inspirationBoard' },
    },
  ],
  edges: [
    {
      id: 'edge-search-group',
      from: 'node-image-search',
      to: 'node-group-references',
      condition: null,
    },
    {
      id: 'edge-group-organize',
      from: 'node-group-references',
      to: 'node-organize-inspiration',
      condition: null,
    },
  ],
  variables: {},
  policies: {
    requiredInputs: ['season', 'category', 'market'],
  },
};

const STYLE_ANALYSIS_DEFINITION: WorkflowDefinition = {
  nodes: [
    {
      id: 'node-color-analysis',
      type: 'agent',
      agentCode: 'fashion-color-analyzer',
      label: 'Color analysis',
      inputMapping: {
        season: 'season',
        category: 'category',
        market: 'market',
        ageBand: 'ageBand',
        constraints: 'constraints',
        inspirationBoard: 'inspirationBoard',
        groupedReferences: 'groupedReferences',
        imageCandidates: 'imageCandidates',
      },
      outputMapping: { colorAnalysis: 'colorAnalysis' },
    },
    {
      id: 'node-style-analysis',
      type: 'agent',
      agentCode: 'fashion-style-analyzer',
      label: 'Style analysis',
      inputMapping: {
        season: 'season',
        category: 'category',
        market: 'market',
        colorAnalysis: 'colorAnalysis',
        inspirationBoard: 'inspirationBoard',
        groupedReferences: 'groupedReferences',
      },
      outputMapping: { styleAnalysis: 'styleAnalysis' },
    },
    {
      id: 'node-pattern-analysis',
      type: 'agent',
      agentCode: 'fashion-pattern-analyzer',
      label: 'Pattern analysis',
      inputMapping: {
        season: 'season',
        category: 'category',
        market: 'market',
        colorAnalysis: 'colorAnalysis',
        styleAnalysis: 'styleAnalysis',
        inspirationBoard: 'inspirationBoard',
      },
      outputMapping: { patternAnalysis: 'patternAnalysis' },
    },
    {
      id: 'node-illustration-analysis',
      type: 'agent',
      agentCode: 'fashion-illustration-analyzer',
      label: 'Illustration analysis',
      inputMapping: {
        season: 'season',
        category: 'category',
        market: 'market',
        colorAnalysis: 'colorAnalysis',
        styleAnalysis: 'styleAnalysis',
        patternAnalysis: 'patternAnalysis',
        inspirationBoard: 'inspirationBoard',
      },
      outputMapping: { styleReport: 'styleReport' },
    },
  ],
  edges: [
    {
      id: 'edge-color-style',
      from: 'node-color-analysis',
      to: 'node-style-analysis',
      condition: null,
    },
    {
      id: 'edge-style-pattern',
      from: 'node-style-analysis',
      to: 'node-pattern-analysis',
      condition: null,
    },
    {
      id: 'edge-pattern-illustration',
      from: 'node-pattern-analysis',
      to: 'node-illustration-analysis',
      condition: null,
    },
  ],
  variables: {},
  policies: {
    requiredInputs: ['season', 'category', 'market'],
  },
};

const DESIGN_BRIEF_DEFINITION: WorkflowDefinition = {
  nodes: [
    {
      id: 'node-design-brief',
      type: 'agent',
      agentCode: 'fashion-design-brief-writer',
      label: 'Generate design brief',
      inputMapping: {
        season: 'season',
        category: 'category',
        market: 'market',
        ageBand: 'ageBand',
        constraints: 'constraints',
        styleReport: 'styleReport',
        colorAnalysis: 'colorAnalysis',
        styleAnalysis: 'styleAnalysis',
        patternAnalysis: 'patternAnalysis',
      },
      outputMapping: { designBrief: 'designBrief' },
    },
    {
      id: 'node-design-specification',
      type: 'agent',
      agentCode: 'fashion-design-spec-writer',
      label: 'Generate design specification',
      inputMapping: {
        season: 'season',
        category: 'category',
        market: 'market',
        designBrief: 'designBrief',
        styleReport: 'styleReport',
        colorAnalysis: 'colorAnalysis',
        styleAnalysis: 'styleAnalysis',
        patternAnalysis: 'patternAnalysis',
      },
      outputMapping: { designSpecification: 'designSpecification' },
    },
  ],
  edges: [
    {
      id: 'edge-brief-spec',
      from: 'node-design-brief',
      to: 'node-design-specification',
      condition: null,
    },
  ],
  variables: {},
  policies: {
    requiredInputs: ['season', 'category', 'market'],
  },
};

const IMAGE_GENERATION_DEFINITION: WorkflowDefinition = {
  nodes: [
    {
      id: 'node-image-prompt-prep',
      type: 'agent',
      agentCode: 'fashion-image-prompt-prep',
      label: 'Prepare generation prompts',
      inputMapping: {
        season: 'season',
        category: 'category',
        market: 'market',
        ageBand: 'ageBand',
        constraints: 'constraints',
        designBrief: 'designBrief',
        designSpecification: 'designSpecification',
      },
      outputMapping: { imageGenPrompts: 'imageGenPrompts' },
    },
    {
      id: 'node-image-generate',
      type: 'agent',
      agentCode: 'fashion-image-generator',
      label: 'Generate artwork variations',
      inputMapping: {
        season: 'season',
        category: 'category',
        market: 'market',
        imageGenPrompts: 'imageGenPrompts',
        designBrief: 'designBrief',
        designSpecification: 'designSpecification',
      },
      outputMapping: { rawGenerations: 'rawGenerations' },
    },
    {
      id: 'node-image-organize',
      type: 'agent',
      agentCode: 'fashion-image-organizer',
      label: 'Organize generation outputs',
      inputMapping: {
        season: 'season',
        category: 'category',
        market: 'market',
        rawGenerations: 'rawGenerations',
        imageGenPrompts: 'imageGenPrompts',
      },
      outputMapping: { generatedImages: 'generatedImages' },
    },
  ],
  edges: [
    {
      id: 'edge-prep-generate',
      from: 'node-image-prompt-prep',
      to: 'node-image-generate',
      condition: null,
    },
    {
      id: 'edge-generate-organize',
      from: 'node-image-generate',
      to: 'node-image-organize',
      condition: null,
    },
  ],
  variables: {},
  policies: {
    requiredInputs: ['season', 'category', 'market', 'designBrief', 'designSpecification'],
  },
};

const DESIGN_REVIEW_DEFINITION: WorkflowDefinition = {
  nodes: [
    {
      id: 'node-quality-review',
      type: 'agent',
      agentCode: 'fashion-quality-reviewer',
      label: 'Review quality',
      inputMapping: {
        season: 'season',
        category: 'category',
        market: 'market',
        ageBand: 'ageBand',
        constraints: 'constraints',
        generatedImages: 'generatedImages',
        designBrief: 'designBrief',
        designSpecification: 'designSpecification',
      },
      outputMapping: { qualityReview: 'qualityReview' },
    },
    {
      id: 'node-improvement-suggestions',
      type: 'agent',
      agentCode: 'fashion-improvement-suggester',
      label: 'Improvement suggestions',
      inputMapping: {
        season: 'season',
        category: 'category',
        market: 'market',
        qualityReview: 'qualityReview',
        generatedImages: 'generatedImages',
      },
      outputMapping: { improvementSuggestions: 'improvementSuggestions' },
    },
    {
      id: 'node-design-score',
      type: 'agent',
      agentCode: 'fashion-design-scorer',
      label: 'Final score',
      inputMapping: {
        season: 'season',
        category: 'category',
        market: 'market',
        qualityReview: 'qualityReview',
        improvementSuggestions: 'improvementSuggestions',
        generatedImages: 'generatedImages',
      },
      outputMapping: { designReviewScore: 'designReviewScore' },
    },
  ],
  edges: [
    {
      id: 'edge-quality-suggestions',
      from: 'node-quality-review',
      to: 'node-improvement-suggestions',
      condition: null,
    },
    {
      id: 'edge-suggestions-score',
      from: 'node-improvement-suggestions',
      to: 'node-design-score',
      condition: null,
    },
  ],
  variables: {},
  policies: {
    requiredInputs: ['season', 'category', 'market', 'generatedImages'],
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
    code: 'sample-empty-workflow',
    name: 'Sample Empty Workflow',
    description: 'Seeded empty workflow (DRAFT) for Builder demos - build from scratch',
    category: 'demo',
    tags: ['demo', 'sample', 'builder'],
    definition: { ...EMPTY_WORKFLOW_DEFINITION, nodes: [], edges: [] },
    status: WorkflowStatus.DRAFT,
    versionStatus: WorkflowVersionStatus.DRAFT,
  },
  {
    code: 'sample-builder-demo',
    name: 'Sample Builder Demo',
    description: 'Seeded workflow (DRAFT) with research→review nodes for Builder editing demos',
    category: 'demo',
    tags: ['demo', 'sample', 'builder'],
    definition: RESEARCH_REVIEW_DEFINITION,
    status: WorkflowStatus.DRAFT,
    versionStatus: WorkflowVersionStatus.DRAFT,
  },
  {
    code: 'sample-research-review',
    name: 'Sample Research → Review',
    description: 'Seeded two-step workflow (PUBLISHED) for Execution demos',
    category: 'demo',
    tags: ['demo', 'sample', 'execution'],
    definition: RESEARCH_REVIEW_DEFINITION,
    status: WorkflowStatus.PUBLISHED,
    versionStatus: WorkflowVersionStatus.PUBLISHED,
  },
  {
    code: 'kids-fashion-trend-research',
    name: 'Kids Fashion Trend Research',
    description: 'Milestone 2 — research trends, collect references, generate research report',
    category: 'kids-fashion',
    tags: ['fashion', 'trend-research', 'milestone-2'],
    definition: TREND_RESEARCH_DEFINITION,
    status: WorkflowStatus.PUBLISHED,
    versionStatus: WorkflowVersionStatus.PUBLISHED,
  },
  {
    code: 'kids-fashion-reference-image',
    name: 'Kids Fashion Reference Image',
    description: 'Milestone 2 — search images, group references, organize inspiration board',
    category: 'kids-fashion',
    tags: ['fashion', 'reference-image', 'milestone-2'],
    definition: REFERENCE_IMAGE_DEFINITION,
    status: WorkflowStatus.PUBLISHED,
    versionStatus: WorkflowVersionStatus.PUBLISHED,
  },
  {
    code: 'kids-fashion-style-analysis',
    name: 'Kids Fashion Style Analysis',
    description: 'Milestone 2 — color, style, pattern, and illustration analysis into styleReport',
    category: 'kids-fashion',
    tags: ['fashion', 'style-analysis', 'milestone-2'],
    definition: STYLE_ANALYSIS_DEFINITION,
    status: WorkflowStatus.PUBLISHED,
    versionStatus: WorkflowVersionStatus.PUBLISHED,
  },
  {
    code: 'kids-fashion-design-brief',
    name: 'Kids Fashion Design Brief',
    description:
      'Milestone 2 — generate design brief then design specification for Image Generation handoff',
    category: 'kids-fashion',
    tags: ['fashion', 'design-brief', 'milestone-2'],
    definition: DESIGN_BRIEF_DEFINITION,
    status: WorkflowStatus.PUBLISHED,
    versionStatus: WorkflowVersionStatus.PUBLISHED,
  },
  {
    code: 'kids-fashion-image-generation',
    name: 'Kids Fashion Image Generation',
    description:
      'Milestone 2 — prepare prompts, generate artwork variations, organize for Design Review handoff',
    category: 'kids-fashion',
    tags: ['fashion', 'image-generation', 'milestone-2'],
    definition: IMAGE_GENERATION_DEFINITION,
    status: WorkflowStatus.PUBLISHED,
    versionStatus: WorkflowVersionStatus.PUBLISHED,
  },
  {
    code: 'kids-fashion-design-review',
    name: 'Kids Fashion Design Review',
    description:
      'Milestone 2 — review artwork quality, suggest improvements, assign final design score',
    category: 'kids-fashion',
    tags: ['fashion', 'design-review', 'milestone-2'],
    definition: DESIGN_REVIEW_DEFINITION,
    status: WorkflowStatus.PUBLISHED,
    versionStatus: WorkflowVersionStatus.PUBLISHED,
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
          changelog: 'Seeded sample workflow',
          publishedAt,
          createdBy: null,
        }),
      );
    } else {
      version.status = sample.versionStatus;
      version.publishedAt = publishedAt ?? version.publishedAt;
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
