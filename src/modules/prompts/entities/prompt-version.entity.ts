import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';

import { BaseEntity } from '@common/entities';

import { PromptVersionStatus } from '../enums';
import { PromptEntity } from './prompt.entity';

@Entity({ name: 'prompt_versions' })
@Unique('UQ_prompt_versions_prompt_id_version', ['promptId', 'version'])
export class PromptVersionEntity extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'prompt_id' })
  promptId!: string;

  @ManyToOne(() => PromptEntity, (prompt) => prompt.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'prompt_id' })
  prompt!: PromptEntity;

  @Column({ type: 'int' })
  version!: number;

  @Column({ type: 'varchar', length: 32, default: PromptVersionStatus.DRAFT })
  status!: PromptVersionStatus;

  @Column({ type: 'text', nullable: true })
  template!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  messages!: Array<{ role: string; content: string }> | null;

  @Column({ type: 'jsonb', name: 'variables_schema', default: () => "'{}'" })
  variablesSchema!: Record<string, unknown>;

  @Column({ type: 'jsonb', name: 'model_hints', default: () => "'{}'" })
  modelHints!: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  changelog!: string | null;

  @Column({ type: 'timestamptz', name: 'published_at', nullable: true })
  publishedAt!: Date | null;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy!: string | null;
}
