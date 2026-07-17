/**
 * Thin FE client interface for Prompt Library.
 * Method signatures only — FE implements HTTP against `prompts-api.yaml` + `types.ts`.
 */

import type {
  CreatePromptRequest,
  CreatePromptVersionRequest,
  MessageResponse,
  PromptListQuery,
  PromptListResponse,
  PromptResponse,
  PromptVersionListResponse,
  PromptVersionResponse,
  UpdatePromptRequest,
} from './types';

/** Base path: `/api/v1` */
export interface PromptsApiClient {
  listPrompts(query?: PromptListQuery): Promise<PromptListResponse>;
  createPrompt(body: CreatePromptRequest): Promise<PromptResponse>;
  getPrompt(id: string): Promise<PromptResponse>;
  getPromptByCode(code: string): Promise<PromptResponse>;
  updatePrompt(id: string, body: UpdatePromptRequest): Promise<PromptResponse>;
  deletePrompt(id: string): Promise<MessageResponse>;
  publishPrompt(id: string): Promise<PromptResponse>;
  enablePrompt(id: string): Promise<PromptResponse>;
  disablePrompt(id: string): Promise<PromptResponse>;
  listPromptVersions(id: string): Promise<PromptVersionListResponse>;
  createPromptVersion(
    id: string,
    body?: CreatePromptVersionRequest,
  ): Promise<PromptVersionResponse>;
  getPromptVersion(id: string, version: number): Promise<PromptVersionResponse>;
}
