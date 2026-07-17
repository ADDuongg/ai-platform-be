import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';

import { BaseEntity } from '@common/entities';

import { ToolVersionStatus } from '../enums';
import { ToolEntity } from './tool.entity';

@Entity({ name: 'tool_versions' })
@Unique('UQ_tool_versions_tool_id_version', ['toolId', 'version'])
export class ToolVersionEntity extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'tool_id' })
  toolId!: string;

  @ManyToOne(() => ToolEntity, (tool) => tool.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tool_id' })
  tool!: ToolEntity;

  @Column({ type: 'int' })
  version!: number;

  @Column({ type: 'varchar', length: 32, default: ToolVersionStatus.DRAFT })
  status!: ToolVersionStatus;

  @Column({ type: 'jsonb', name: 'config_json', default: () => "'{}'" })
  configJson!: Record<string, unknown>;

  @Column({ type: 'jsonb', name: 'input_schema', default: () => "'{}'" })
  inputSchema!: Record<string, unknown>;

  @Column({ type: 'jsonb', name: 'output_schema', default: () => "'{}'" })
  outputSchema!: Record<string, unknown>;

  @Column({ type: 'varchar', length: 255, name: 'secret_ref', nullable: true })
  secretRef!: string | null;

  @Column({ type: 'int', name: 'timeout_ms', nullable: true })
  timeoutMs!: number | null;

  @Column({ type: 'int', name: 'max_retries', nullable: true })
  maxRetries!: number | null;

  @Column({ type: 'text', nullable: true })
  changelog!: string | null;

  @Column({ type: 'timestamptz', name: 'published_at', nullable: true })
  publishedAt!: Date | null;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy!: string | null;
}
