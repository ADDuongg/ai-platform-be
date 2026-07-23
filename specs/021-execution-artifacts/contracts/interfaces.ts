/**
 * Thin FE client for Execution Artifacts (021).
 * Method signatures only — implement HTTP against
 * `execution-artifacts-api.yaml` + `types.ts`.
 *
 * Base path: `/api/v1`. Bearer JWT + `executions:read`.
 */

import type { ExecutionArtifactListResponse, ExecutionArtifactResponse } from './types';

export interface ExecutionArtifactsApiClient {
  /** Requires `executions:read`. */
  listExecutionArtifacts(executionId: string): Promise<ExecutionArtifactListResponse>;

  /**
   * Requires `executions:read`.
   * Returns binary/Blob for file-like kinds, or parsed JSON for inline / image_set manifest.
   * Optional `item` selects one image_set blob by index.
   */
  getExecutionArtifactContent(
    executionId: string,
    artifactId: string,
    options?: { item?: number },
  ): Promise<Blob | ArrayBuffer | Record<string, unknown>>;

  /** Convenience: metadata already on list; optional get-by-id if FE caches list. */
  getExecutionArtifact?(
    executionId: string,
    artifactId: string,
  ): Promise<ExecutionArtifactResponse>;
}
