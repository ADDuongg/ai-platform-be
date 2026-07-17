import { Column, Entity, OneToMany } from 'typeorm';

import { BaseEntity } from '@common/entities';

import { ToolStatus, ToolType } from '../enums';
import { ToolVersionEntity } from './tool-version.entity';

@Entity({ name: 'tools' })
export class ToolEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 64 })
  code!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 32, name: 'tool_type' })
  toolType!: ToolType;

  @Column({ type: 'varchar', length: 32, default: ToolStatus.DRAFT })
  status!: ToolStatus;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Column({ type: 'int', name: 'current_version', nullable: true })
  currentVersion!: number | null;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy!: string | null;

  @OneToMany(() => ToolVersionEntity, (version) => version.tool)
  versions!: ToolVersionEntity[];
}
