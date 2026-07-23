import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { AuditAction, AuditDomain } from '../constants/audit.constants';

@Entity({ name: 'domain_audit_logs' })
export class DomainAuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 32 })
  domain!: AuditDomain;

  @Column({ type: 'varchar', length: 50 })
  action!: AuditAction;

  @Column({ type: 'varchar', length: 64, name: 'resource_type' })
  resourceType!: string;

  @Column({ type: 'uuid', name: 'resource_id' })
  resourceId!: string;

  @Column({ type: 'varchar', length: 128, name: 'resource_code', nullable: true })
  resourceCode!: string | null;

  @Column({ type: 'uuid', name: 'actor_user_id', nullable: true })
  actorUserId!: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip!: string | null;

  @Column({ type: 'varchar', length: 512, name: 'user_agent', nullable: true })
  userAgent!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
