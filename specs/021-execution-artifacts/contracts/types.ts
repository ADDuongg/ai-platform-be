/**
 * FE contracts — Execution Artifacts (021).
 * Aligned with `execution-artifacts-api.yaml`.
 * Implementation-agnostic: no Nest/TypeORM imports.
 */

// ─── Shared envelopes ───────────────────────────────────────────────────────

export type JsonObject = Record<string, unknown>;

export type ArtifactErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'EXECUTION_NOT_FOUND'
  | 'ARTIFACT_NOT_FOUND'
  | 'ARTIFACT_NOT_READY'
  | string;

export interface ApiErrorBody {
  code: ArtifactErrorCode;
  message: string;
  details: unknown | null;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorBody;
  timestamp: string;
  path: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

// ─── Permissions ────────────────────────────────────────────────────────────

/** List / download artifacts — same as viewing the Execution. */
export type ExecutionArtifactPermission = 'executions:read';

// ─── Domain types ───────────────────────────────────────────────────────────

export type ArtifactKind = 'text' | 'json' | 'image' | 'image_set' | 'file' | 'url';

export type ArtifactPersist = 'inline' | 'blob';

export type ArtifactStatus = 'ready' | 'failed';

/** Workflow definition declaration under `policies.outputs` (FE/Builder reference). */
export interface WorkflowOutputDeclaration {
  key: string;
  kind: ArtifactKind;
  label?: string;
  persist: ArtifactPersist;
}

export interface ImageSetManifestItem {
  storageKey: string;
  contentType?: string | null;
  byteSize?: number | null;
  sourceUrl?: string | null;
  errorMessage?: string | null;
}

export interface ImageSetManifest {
  items: ImageSetManifestItem[];
}

export interface ExecutionArtifactResponse {
  id: string;
  executionId: string;
  key: string;
  kind: ArtifactKind;
  label: string | null;
  persist: ArtifactPersist;
  status: ArtifactStatus;
  contentJson: JsonObject | null;
  storageKey: string | null;
  contentType: string | null;
  byteSize: number | null;
  sourceNodeId: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export type ExecutionArtifactListResponse = ExecutionArtifactResponse[];
