import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';

import { BaseEntity } from '@common/entities';

import { AgentVersionStatus } from '../enums';
import { AgentEntity } from './agent.entity';

@Entity({ name: 'agent_versions' })
@Unique('UQ_agent_versions_agent_id_version', ['agentId', 'version'])
export class AgentVersionEntity extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'agent_id' })
  agentId!: string;

  @ManyToOne(() => AgentEntity, (agent) => agent.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent!: AgentEntity;

  @Column({ type: 'int' })
  version!: number;

  @Column({ type: 'varchar', length: 32, default: AgentVersionStatus.DRAFT })
  status!: AgentVersionStatus;

  @Column({ type: 'jsonb', name: 'input_schema' })
  inputSchema!: Record<string, unknown>;

  @Column({ type: 'jsonb', name: 'output_schema' })
  outputSchema!: Record<string, unknown>;

  @Column({ type: 'jsonb', name: 'config_json', default: () => "'{}'" })
  configJson!: Record<string, unknown>;

  @Column({ type: 'int', name: 'timeout_ms', nullable: true })
  timeoutMs!: number | null;

  @Column({ type: 'int', name: 'max_retries', nullable: true })
  maxRetries!: number | null;

  @Column({ type: 'varchar', length: 128, name: 'prompt_ref', nullable: true })
  promptRef!: string | null;

  @Column({ type: 'jsonb', name: 'tool_refs', default: () => "'[]'" })
  toolRefs!: string[];

  @Column({ type: 'text', nullable: true })
  changelog!: string | null;

  @Column({ type: 'timestamptz', name: 'published_at', nullable: true })
  publishedAt!: Date | null;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy!: string | null;
}
