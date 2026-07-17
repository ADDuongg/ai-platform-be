import { Column, Entity, OneToMany } from 'typeorm';

import { BaseEntity } from '@common/entities';

import { PromptStatus } from '../enums';
import { PromptVersionEntity } from './prompt-version.entity';

@Entity({ name: 'prompts' })
export class PromptEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 64 })
  code!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  category!: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  tags!: string[];

  @Column({ type: 'varchar', length: 32, default: PromptStatus.DRAFT })
  status!: PromptStatus;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Column({ type: 'int', name: 'current_version', nullable: true })
  currentVersion!: number | null;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy!: string | null;

  @OneToMany(() => PromptVersionEntity, (version) => version.prompt)
  versions!: PromptVersionEntity[];
}
