import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';

import { BaseEntity } from '@common/entities';

import { ExecutionStepStatus } from '../enums';
import { ExecutionEntity } from './execution.entity';

@Entity({ name: 'execution_steps' })
@Unique('UQ_execution_steps_execution_id_node_id', ['executionId', 'nodeId'])
export class ExecutionStepEntity extends BaseEntity {
  @Index('IDX_execution_steps_execution_id')
  @Column({ type: 'uuid', name: 'execution_id' })
  executionId!: string;

  @ManyToOne(() => ExecutionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'execution_id' })
  execution!: ExecutionEntity;

  @Column({ type: 'varchar', length: 64, name: 'node_id' })
  nodeId!: string;

  @Column({ type: 'varchar', length: 64, name: 'agent_code' })
  agentCode!: string;

  @Column({ type: 'int', name: 'agent_version' })
  agentVersion!: number;

  @Column({ type: 'varchar', length: 32, default: ExecutionStepStatus.PENDING })
  status!: ExecutionStepStatus;

  @Column({ type: 'int', default: 0 })
  attempt!: number;

  @Column({ type: 'int', name: 'max_retries', default: 0 })
  maxRetries!: number;

  @Column({ type: 'jsonb', name: 'input_json', nullable: true })
  inputJson!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', name: 'output_json', nullable: true })
  outputJson!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', name: 'error_json', nullable: true })
  errorJson!: Record<string, unknown> | null;

  @Column({ type: 'timestamptz', name: 'started_at', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt!: Date | null;
}
