import { Column, Entity, Index, OneToMany } from 'typeorm';

import { BaseEntity } from '@common/entities';

import { WorkflowStatus } from '../enums';
import { WorkflowVersionEntity } from './workflow-version.entity';

@Entity({ name: 'workflows' })
export class WorkflowEntity extends BaseEntity {
  @Index('IDX_workflows_code')
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

  @Column({ type: 'varchar', length: 32, default: WorkflowStatus.DRAFT })
  status!: WorkflowStatus;

  @Column({ type: 'int', name: 'current_version', nullable: true })
  currentVersion!: number | null;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy!: string | null;

  @OneToMany(() => WorkflowVersionEntity, (version) => version.workflow)
  versions!: WorkflowVersionEntity[];
}
