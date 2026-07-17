/** Contract types mirroring executions-api.yaml (documentation aid). */

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ExecutionStepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'retrying';

export interface ExecuteWorkflowRequest {
  version?: number | null;
  input?: Record<string, unknown>;
}

export interface CreateExecutionRequest extends ExecuteWorkflowRequest {
  workflowId: string;
}

export interface ExecutionDto {
  id: string;
  workflowId: string;
  workflowCode: string;
  workflowVersion: number;
  status: ExecutionStatus;
  input: Record<string, unknown>;
  context: Record<string, unknown>;
  error: Record<string, unknown> | null;
  startedBy: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionStepDto {
  id: string;
  executionId: string;
  nodeId: string;
  agentCode: string;
  agentVersion: number;
  status: ExecutionStepStatus;
  attempt: number;
  maxRetries: number;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: Record<string, unknown> | null;
  startedAt: string | null;
  completedAt: string | null;
}
