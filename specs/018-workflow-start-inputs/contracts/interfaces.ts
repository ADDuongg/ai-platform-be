/**
 * Thin FE client interface for Workflow start inputs + Builder I/O mapping.
 * Method signatures only — FE implements HTTP against
 * `workflow-start-inputs-api.yaml` + `types.ts`.
 *
 * Base path: `/api/v1`. All methods require Bearer JWT.
 * Typical permissions:
 * - read definition / list: `workflows:read`
 * - replace definition / update node: `workflows:update` (draft)
 * - publish: `workflows:publish`
 * - execute: `workflows:execute` / `executions:create` (as seeded)
 */

import type {
  ExecuteWorkflowRequest,
  ExecutionResponse,
  ReplaceWorkflowDefinitionRequest,
  UpdateWorkflowNodeRequest,
  WorkflowDefinitionResponse,
  WorkflowDetailResponse,
  WorkflowListQuery,
  WorkflowListResponse,
} from './types';

export interface WorkflowStartInputsApiClient {
  /** Resolve operator workflow: list and match `code`, or use known id. */
  listWorkflows(query?: WorkflowListQuery): Promise<WorkflowListResponse>;

  getWorkflow(id: string): Promise<WorkflowDetailResponse>;

  /**
   * Draft for mutate roles; published snapshot for read-only operators
   * (server chooses based on permissions — see OpenAPI description).
   */
  getWorkflowDefinition(workflowId: string): Promise<WorkflowDefinitionResponse>;

  /** Replace entire draft definition (include full `policies`). */
  replaceWorkflowDefinition(
    workflowId: string,
    body: ReplaceWorkflowDefinitionRequest,
  ): Promise<WorkflowDefinitionResponse>;

  /** Publish current draft → operators see new `requiredInputs` / `inputSchema`. */
  publishWorkflow(workflowId: string): Promise<WorkflowDetailResponse>;

  /** Phase B — patch node mappings on draft. */
  updateWorkflowNode(
    workflowId: string,
    nodeId: string,
    body: UpdateWorkflowNodeRequest,
  ): Promise<WorkflowDefinitionResponse>;

  /** Start run; `input` keys should satisfy published `requiredInputs`. */
  executeWorkflow(
    workflowId: string,
    body?: ExecuteWorkflowRequest,
  ): Promise<ExecutionResponse>;
}
