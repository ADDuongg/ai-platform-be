export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: Record<string, unknown>;
  policies: Record<string, unknown>;
}

export interface WorkflowNode {
  id: string;
  type: 'agent';
  agentCode: string;
  agentVersion?: number | null;
  label?: string | null;
  position?: { x: number; y: number } | null;
  inputMapping?: Record<string, unknown>;
  outputMapping?: Record<string, unknown>;
  timeoutMs?: number | null;
  maxRetries?: number | null;
  config?: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  from: string;
  to: string;
  condition?: null;
}
