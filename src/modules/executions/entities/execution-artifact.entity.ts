import { Column, Entity, Index, Unique } from 'typeorm';

import { BaseEntity } from '@common/entities';

import { ArtifactKind, ArtifactPersist, ArtifactStatus } from '../enums/artifact.enums';

@Entity({ name: 'execution_artifacts' })
@Unique('UQ_execution_artifacts_execution_id_key', ['executionId', 'key'])
export class ExecutionArtifactEntity extends BaseEntity {
  @Index('IDX_execution_artifacts_execution_id')
  @Column({ type: 'uuid', name: 'execution_id' })
  executionId!: string;

  @Column({ type: 'varchar', length: 128 })
  key!: string;

  @Column({ type: 'varchar', length: 32 })
  kind!: ArtifactKind;

  @Column({ type: 'varchar', length: 256, nullable: true })
  label!: string | null;

  @Column({ type: 'varchar', length: 16 })
  persist!: ArtifactPersist;

  @Column({ type: 'varchar', length: 16, default: ArtifactStatus.READY })
  status!: ArtifactStatus;

  @Column({ type: 'jsonb', name: 'content_json', nullable: true })
  contentJson!: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 512, name: 'storage_key', nullable: true })
  storageKey!: string | null;

  @Column({ type: 'varchar', length: 128, name: 'content_type', nullable: true })
  contentType!: string | null;

  @Column({ type: 'int', name: 'byte_size', nullable: true })
  byteSize!: number | null;

  @Column({ type: 'varchar', length: 64, name: 'source_node_id', nullable: true })
  sourceNodeId!: string | null;

  @Column({ type: 'text', name: 'error_message', nullable: true })
  errorMessage!: string | null;

  @Column({ type: 'jsonb', name: 'error_json', nullable: true })
  errorJson!: Record<string, unknown> | null;
}
