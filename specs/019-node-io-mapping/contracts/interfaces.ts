/**
 * Thin FE client for Builder Node I/O Mapping.
 * Method signatures only — implement HTTP against
 * `node-io-mapping-api.yaml` + `types.ts`.
 *
 * Base path: `/api/v1`. Bearer JWT required.
 * Permissions:
 * - get definition: `workflows:read`
 * - update node / replace definition: `workflows:update` (draft)
 * - publish: `workflows:publish`
 */

import type {
  ReplaceWorkflowDefinitionRequest,
  UpdateWorkflowNodeRequest,
  WorkflowDefinitionResponse,
  WorkflowDetailResponse,
} from './types';

export interface NodeIoMappingApiClient {
  getWorkflowDefinition(workflowId: string): Promise<WorkflowDefinitionResponse>;

  /**
   * Preferred: patch `inputMapping` / `outputMapping` on one draft node.
   * Omit a field to leave it unchanged; send `{}` to clear a map.
   */
  updateWorkflowNode(
    workflowId: string,
    nodeId: string,
    body: UpdateWorkflowNodeRequest,
  ): Promise<WorkflowDefinitionResponse>;

  /** Alternate: replace entire draft definition (include full nodes array). */
  replaceWorkflowDefinition(
    workflowId: string,
    body: ReplaceWorkflowDefinitionRequest,
  ): Promise<WorkflowDefinitionResponse>;

  publishWorkflow(workflowId: string): Promise<WorkflowDetailResponse>;
}
