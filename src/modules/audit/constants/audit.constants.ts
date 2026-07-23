export enum AuditDomain {
  AGENT = 'agent',
  WORKFLOW = 'workflow',
  TOOL = 'tool',
  PROMPT = 'prompt',
  EXECUTION = 'execution',
}

export enum AuditAction {
  CREATED = 'created',
  UPDATED = 'updated',
  PUBLISHED = 'published',
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
  EXECUTION_STARTED = 'execution_started',
  EXECUTION_CANCELLED = 'execution_cancelled',
  EXECUTION_RETRIED = 'execution_retried',
  LLM_CONFIG_CHANGED = 'llm_config_changed',
}

export type RecordAuditParams = {
  domain: AuditDomain;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  resourceCode?: string | null;
  actorUserId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
};
