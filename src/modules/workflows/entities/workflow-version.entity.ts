import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';

import { BaseEntity } from '@common/entities';

import { WorkflowVersionStatus } from '../enums';
import type { WorkflowDefinition } from '../types';
import { WorkflowEntity } from './workflow.entity';

export type { WorkflowDefinition } from '../types';

@Entity({ name: 'workflow_versions' })
@Unique('UQ_workflow_versions_workflow_id_version', ['workflowId', 'version'])
export class WorkflowVersionEntity extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'workflow_id' })
  workflowId!: string;

  @ManyToOne(() => WorkflowEntity, (workflow) => workflow.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workflow_id' })
  workflow!: WorkflowEntity;

  @Column({ type: 'int' })
  version!: number;

  @Column({ type: 'varchar', length: 32, default: WorkflowVersionStatus.DRAFT })
  status!: WorkflowVersionStatus;

  @Column({ type: 'jsonb', name: 'definition_json' })
  definitionJson!: WorkflowDefinition;

  @Column({ type: 'text', nullable: true })
  changelog!: string | null;

  @Column({ type: 'timestamptz', name: 'published_at', nullable: true })
  publishedAt!: Date | null;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy!: string | null;
}
