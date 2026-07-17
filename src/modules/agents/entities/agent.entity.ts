import { Column, Entity, Index, OneToMany } from 'typeorm';

import { BaseEntity } from '@common/entities';

import { AgentStatus, CapabilityType } from '../enums';
import { AgentVersionEntity } from './agent-version.entity';

@Entity({ name: 'agents' })
export class AgentEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  code!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 32, name: 'capability_type' })
  capabilityType!: CapabilityType;

  @Column({ type: 'varchar', length: 32, default: AgentStatus.DRAFT })
  status!: AgentStatus;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Column({ type: 'int', name: 'current_version', nullable: true })
  currentVersion!: number | null;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy!: string | null;

  @OneToMany(() => AgentVersionEntity, (version) => version.agent)
  versions!: AgentVersionEntity[];
}
