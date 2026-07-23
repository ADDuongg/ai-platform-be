/**
 * Thin FE client for Agent / Prompt draft editors (020).
 * Method signatures only — implement HTTP against
 * `agent-prompt-draft-editors-api.yaml` + `types.ts`.
 *
 * Base path: `/api/v1`. Bearer JWT required.
 *
 * Permissions:
 * - read / list versions: `agents:read` / `prompts:read`
 * - create draft version + PATCH draft: `agents:update` / `prompts:update`
 * - publish: `agents:publish` / `prompts:publish`
 *
 * Full catalogs: see `specs/002-agent-registry` and `specs/006-prompt-library`.
 */

import type {
  AgentSummaryResponse,
  AgentVersionResponse,
  CreateAgentVersionRequest,
  CreatePromptVersionRequest,
  PromptSummaryResponse,
  PromptVersionResponse,
  UpdateAgentDraftRequest,
  UpdatePromptDraftRequest,
} from './types';

export interface AgentPromptDraftEditorsApiClient {
  // ── Agents ──────────────────────────────────────────────────────────────
  getAgent(id: string): Promise<AgentSummaryResponse>;

  /** Requires `agents:update`. 409 if draft already exists. */
  createAgentVersion(
    id: string,
    body?: CreateAgentVersionRequest,
  ): Promise<AgentVersionResponse>;

  getAgentVersion(id: string, version: number): Promise<AgentVersionResponse>;

  /**
   * Requires `agents:update`.
   * Config/schema fields need an existing draft — else 409 `AGENT_NO_DRAFT_TO_PUBLISH`.
   */
  updateAgentDraft(
    id: string,
    body: UpdateAgentDraftRequest,
  ): Promise<AgentSummaryResponse>;

  /** Requires `agents:publish`. */
  publishAgent(id: string): Promise<AgentSummaryResponse>;

  // ── Prompts ─────────────────────────────────────────────────────────────
  getPrompt(id: string): Promise<PromptSummaryResponse>;

  createPromptVersion(
    id: string,
    body?: CreatePromptVersionRequest,
  ): Promise<PromptVersionResponse>;

  getPromptVersion(id: string, version: number): Promise<PromptVersionResponse>;

  /**
   * Requires `prompts:update`.
   * Content fields need draft — else 409 `PROMPT_VERSION_IMMUTABLE` (existing BE).
   */
  updatePromptDraft(
    id: string,
    body: UpdatePromptDraftRequest,
  ): Promise<PromptSummaryResponse>;

  /** Requires `prompts:publish`. */
  publishPrompt(id: string): Promise<PromptSummaryResponse>;
}
