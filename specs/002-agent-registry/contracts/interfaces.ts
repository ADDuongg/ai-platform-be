/**
 * Thin FE client interface for Agent Registry.
 * Method signatures only — FE implements HTTP against `agents-api.yaml` + `types.ts`.
 */

import type {
  AgentListQuery,
  AgentListResponse,
  AgentResponse,
  AgentVersionListResponse,
  AgentVersionResponse,
  CreateAgentRequest,
  CreateAgentVersionRequest,
  MessageResponse,
  UpdateAgentRequest,
} from './types';

/** Base path: `/api/v1` */
export interface AgentsApiClient {
  listAgents(query?: AgentListQuery): Promise<AgentListResponse>;
  createAgent(body: CreateAgentRequest): Promise<AgentResponse>;
  getAgent(id: string): Promise<AgentResponse>;
  updateAgent(id: string, body: UpdateAgentRequest): Promise<AgentResponse>;
  deleteAgent(id: string): Promise<MessageResponse>;
  publishAgent(id: string): Promise<AgentResponse>;
  enableAgent(id: string): Promise<AgentResponse>;
  disableAgent(id: string): Promise<AgentResponse>;
  listAgentVersions(id: string): Promise<AgentVersionListResponse>;
  createAgentVersion(
    id: string,
    body?: CreateAgentVersionRequest,
  ): Promise<AgentVersionResponse>;
  getAgentVersion(id: string, version: number): Promise<AgentVersionResponse>;
}
