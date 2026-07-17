export type AgentRunnerInvokeInput = {
  agentCode: string;
  agentVersion: number;
  nodeId: string;
  input: Record<string, unknown>;
  config?: Record<string, unknown>;
  attempt: number;
};

export interface AgentRunner {
  invoke(params: AgentRunnerInvokeInput): Promise<Record<string, unknown>>;
}
