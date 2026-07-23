/**
 * Thin FE client interface for Tool Library.
 * Method signatures only — FE implements HTTP against `tools-api.yaml` + `types.ts`.
 */

import type {
  CreateToolRequest,
  CreateToolVersionRequest,
  MessageResponse,
  SearchProvider,
  ToolListQuery,
  ToolListResponse,
  ToolResponse,
  ToolVersionListResponse,
  ToolVersionResponse,
  UpdateToolRequest,
} from './types';

/** Base path: `/api/v1` */
export interface ToolsApiClient {
  listTools(query?: ToolListQuery): Promise<ToolListResponse>;
  createTool(body: CreateToolRequest): Promise<ToolResponse>;
  getTool(id: string): Promise<ToolResponse>;
  getToolByCode(code: string): Promise<ToolResponse>;
  updateTool(id: string, body: UpdateToolRequest): Promise<ToolResponse>;
  deleteTool(id: string): Promise<MessageResponse>;
  publishTool(id: string): Promise<ToolResponse>;
  enableTool(id: string): Promise<ToolResponse>;
  disableTool(id: string): Promise<ToolResponse>;
  listToolVersions(id: string): Promise<ToolVersionListResponse>;
  createToolVersion(
    id: string,
    body?: CreateToolVersionRequest,
  ): Promise<ToolVersionResponse>;
  getToolVersion(id: string, version: number): Promise<ToolVersionResponse>;
  /** Static allowlist for web-search Tool config selects */
  listSearchProviders(): Promise<{ data: SearchProvider[] }>;
}
