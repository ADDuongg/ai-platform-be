import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum AuthAction {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  LOGOUT_ALL = 'logout_all',
  TOKEN_REFRESH = 'token_refresh',
  TOKEN_REUSE_DETECTED = 'token_reuse_detected',
  PASSWORD_CHANGED = 'password_changed',
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  PASSWORD_RESET_COMPLETED = 'password_reset_completed',
  ACCOUNT_LOCKED = 'account_locked',
  ROLE_CHANGE = 'role_change',
}

@Entity({ name: 'auth_audit_logs' })
export class AuthAuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  userId!: string | null;

  @Column({ type: 'varchar', length: 50 })
  action!: AuthAction;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip!: string | null;

  @Column({ type: 'varchar', length: 512, name: 'user_agent', nullable: true })
  userAgent!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
