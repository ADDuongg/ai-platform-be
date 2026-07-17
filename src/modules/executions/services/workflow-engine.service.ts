import { Injectable } from '@nestjs/common';

import type { WorkflowDefinition, WorkflowEdge, WorkflowNode } from '@modules/workflows/types';

import { ExecutionStepStatus } from '../enums';

export type StepState = {
  nodeId: string;
  status: ExecutionStepStatus;
};

@Injectable()
export class WorkflowEngineService {
  getPredecessors(nodeId: string, edges: WorkflowEdge[]): string[] {
    return edges.filter((edge) => edge.to === nodeId).map((edge) => edge.from);
  }

  /**
   * Nodes whose predecessors are all completed and that are still pending/retrying.
   */
  resolveReadyNodeIds(definition: WorkflowDefinition, steps: StepState[]): string[] {
    const statusByNode = new Map(steps.map((step) => [step.nodeId, step.status]));
    const ready: string[] = [];

    for (const node of definition.nodes) {
      const status = statusByNode.get(node.id);
      if (status !== ExecutionStepStatus.PENDING && status !== ExecutionStepStatus.RETRYING) {
        continue;
      }
      const predecessors = this.getPredecessors(node.id, definition.edges);
      const allDone = predecessors.every(
        (pred) => statusByNode.get(pred) === ExecutionStepStatus.COMPLETED,
      );
      if (allDone) {
        ready.push(node.id);
      }
    }

    return ready;
  }

  findNode(definition: WorkflowDefinition, nodeId: string): WorkflowNode | undefined {
    return definition.nodes.find((node) => node.id === nodeId);
  }

  allCompleted(steps: StepState[]): boolean {
    if (steps.length === 0) {
      return true;
    }
    return steps.every((step) => step.status === ExecutionStepStatus.COMPLETED);
  }

  hasFailed(steps: StepState[]): boolean {
    return steps.some((step) => step.status === ExecutionStepStatus.FAILED);
  }
}
