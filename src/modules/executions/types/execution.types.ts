import type { WorkflowDefinition } from '@modules/workflows/types';

export type AgentPin = {
  nodeId: string;
  agentCode: string;
  agentVersion: number;
};

export type DefinitionSnapshot = {
  definition: WorkflowDefinition;
  agentPins: AgentPin[];
};
