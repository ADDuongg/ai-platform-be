import { Column, Entity, Index } from 'typeorm';

import { BaseEntity } from '@common/entities';

import { ExecutionStatus } from '../enums';
import type { DefinitionSnapshot } from '../types';

@Entity({ name: 'executions' })
export class ExecutionEntity extends BaseEntity {
  @Index('IDX_executions_workflow_id')
  @Column({ type: 'uuid', name: 'workflow_id' })
  workflowId!: string;

  @Column({ type: 'varchar', length: 64, name: 'workflow_code' })
  workflowCode!: string;

  @Column({ type: 'int', name: 'workflow_version' })
  workflowVersion!: number;

  @Index('IDX_executions_status')
  @Column({ type: 'varchar', length: 32, default: ExecutionStatus.PENDING })
  status!: ExecutionStatus;

  @Column({ type: 'jsonb', name: 'input_json', default: () => "'{}'" })
  inputJson!: Record<string, unknown>;

  @Column({ type: 'jsonb', name: 'context_json', default: () => "'{}'" })
  contextJson!: Record<string, unknown>;

  @Column({ type: 'jsonb', name: 'definition_snapshot' })
  definitionSnapshot!: DefinitionSnapshot;

  @Column({ type: 'jsonb', name: 'error_json', nullable: true })
  errorJson!: Record<string, unknown> | null;

  @Index('IDX_executions_started_by')
  @Column({ type: 'uuid', name: 'started_by', nullable: true })
  startedBy!: string | null;

  @Column({ type: 'timestamptz', name: 'started_at', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt!: Date | null;
}
