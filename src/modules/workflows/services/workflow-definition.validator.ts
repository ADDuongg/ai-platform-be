import { HttpStatus, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { ERROR_CODES } from '@common/constants';
import { AppException } from '@common/exceptions';
import { assertDefinitionJsonPayloadSize } from '@common/utils';

import { AgentsService } from '../../agents/services/agents.service';
import type {
  WorkflowDefinition,
  WorkflowEdge,
  WorkflowNode,
  WorkflowNodePosition,
} from '../types';

export type DefinitionValidationError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type DefinitionValidationResult = {
  valid: boolean;
  errors: DefinitionValidationError[];
  definition?: WorkflowDefinition;
};

@Injectable()
export class WorkflowDefinitionValidator {
  constructor(private readonly agentsService: AgentsService) {}

  cloneDefinition(definition: WorkflowDefinition): WorkflowDefinition {
    return {
      nodes: definition.nodes.map((node) => ({
        ...node,
        position: node.position ? { ...node.position } : node.position,
        inputMapping: node.inputMapping ? { ...node.inputMapping } : node.inputMapping,
        outputMapping: node.outputMapping ? { ...node.outputMapping } : node.outputMapping,
        config: node.config ? { ...node.config } : node.config,
      })),
      edges: definition.edges.map((edge) => ({ ...edge })),
      variables: { ...definition.variables },
      policies: { ...definition.policies },
    };
  }

  emptyDefinition(): WorkflowDefinition {
    return { nodes: [], edges: [], variables: {}, policies: {} };
  }

  coerceLoose(input?: Record<string, unknown> | WorkflowDefinition): WorkflowDefinition {
    if (!input) {
      return this.emptyDefinition();
    }
    return {
      nodes: Array.isArray(input.nodes) ? ([...input.nodes] as WorkflowNode[]) : [],
      edges: Array.isArray(input.edges) ? ([...input.edges] as WorkflowEdge[]) : [],
      variables:
        typeof input.variables === 'object' &&
        input.variables !== null &&
        !Array.isArray(input.variables)
          ? { ...(input.variables as Record<string, unknown>) }
          : {},
      policies:
        typeof input.policies === 'object' &&
        input.policies !== null &&
        !Array.isArray(input.policies)
          ? { ...(input.policies as Record<string, unknown>) }
          : {},
    };
  }

  assertPayloadSize(value: unknown): void {
    assertDefinitionJsonPayloadSize(value);
  }

  async validate(
    input: unknown,
    options: { checkAgents?: boolean } = { checkAgents: true },
  ): Promise<DefinitionValidationResult> {
    const errors: DefinitionValidationError[] = [];
    const raw = this.assertDefinitionShape(input, errors);
    if (!raw) {
      return { valid: false, errors };
    }

    const nodes = this.parseNodes(raw, errors);
    const nodeIds = new Set(nodes.map((node) => node.id));
    const edges = this.parseEdges(raw, errors, nodeIds);

    this.assertAcyclic(nodes, edges, errors);

    const definition = this.buildDefinition(raw, nodes, edges);
    this.assertPayloadSizeSafe(definition, errors);

    if (options.checkAgents !== false && errors.length === 0) {
      await this.assertAgentsAssignable(nodes, errors);
    }

    return {
      valid: errors.length === 0,
      errors,
      definition: errors.length === 0 ? definition : undefined,
    };
  }

  async assertValid(
    input: unknown,
    options: { checkAgents?: boolean } = { checkAgents: true },
  ): Promise<WorkflowDefinition> {
    const result = await this.validate(input, options);
    if (!result.valid || !result.definition) {
      const first = result.errors[0];
      throw new AppException(
        first?.message ?? 'Invalid workflow definition',
        HttpStatus.BAD_REQUEST,
        {
          code:
            (first?.code as typeof ERROR_CODES.WORKFLOW_INVALID_GRAPH) ??
            ERROR_CODES.WORKFLOW_INVALID_GRAPH,
          details: {
            errors: result.errors,
            ...(first?.details ?? {}),
          },
        },
      );
    }
    return result.definition;
  }

  createId(explicit?: string): string {
    const id = explicit?.trim();
    return id && id.length > 0 ? id : randomUUID();
  }

  private assertDefinitionShape(
    input: unknown,
    errors: DefinitionValidationError[],
  ): Record<string, unknown> | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      errors.push({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'definition must be an object',
      });
      return null;
    }

    const raw = input as Record<string, unknown>;
    if (!Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) {
      errors.push({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'definition.nodes and definition.edges must be arrays',
      });
      return null;
    }

    return raw;
  }

  private parseNodes(
    raw: Record<string, unknown>,
    errors: DefinitionValidationError[],
  ): WorkflowNode[] {
    const nodes: WorkflowNode[] = [];
    const nodeIds = new Set<string>();

    for (const [index, item] of (raw.nodes as unknown[]).entries()) {
      const parsed = this.parseNode(item, index, errors);
      if (!parsed) {
        continue;
      }
      if (this.isDuplicateId(parsed.id, nodeIds, errors, 'node')) {
        continue;
      }
      nodes.push(parsed);
    }

    return nodes;
  }

  private parseEdges(
    raw: Record<string, unknown>,
    errors: DefinitionValidationError[],
    nodeIds: Set<string>,
  ): WorkflowEdge[] {
    const edges: WorkflowEdge[] = [];
    const edgeIds = new Set<string>();
    const edgePairs = new Set<string>();

    for (const [index, item] of (raw.edges as unknown[]).entries()) {
      const parsed = this.parseEdge(item, index, errors, nodeIds);
      if (!parsed) {
        continue;
      }
      if (this.isDuplicateId(parsed.id, edgeIds, errors, 'edge')) {
        continue;
      }
      const pairKey = `${parsed.from}->${parsed.to}`;
      if (edgePairs.has(pairKey)) {
        errors.push({
          code: ERROR_CODES.WORKFLOW_INVALID_GRAPH,
          message: `Duplicate edge from ${parsed.from} to ${parsed.to}`,
          details: { from: parsed.from, to: parsed.to },
        });
        continue;
      }
      edgeIds.add(parsed.id);
      edgePairs.add(pairKey);
      edges.push(parsed);
    }

    return edges;
  }

  private assertAcyclic(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    errors: DefinitionValidationError[],
  ): void {
    if (this.hasCycle(nodes, edges)) {
      errors.push({
        code: ERROR_CODES.WORKFLOW_INVALID_GRAPH,
        message: 'Workflow graph contains a cycle',
      });
    }
  }

  private buildDefinition(
    raw: Record<string, unknown>,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
  ): WorkflowDefinition {
    const variables =
      typeof raw.variables === 'object' && raw.variables !== null && !Array.isArray(raw.variables)
        ? { ...(raw.variables as Record<string, unknown>) }
        : {};
    const policies =
      typeof raw.policies === 'object' && raw.policies !== null && !Array.isArray(raw.policies)
        ? { ...(raw.policies as Record<string, unknown>) }
        : {};

    return { nodes, edges, variables, policies };
  }

  private assertPayloadSizeSafe(
    definition: WorkflowDefinition,
    errors: DefinitionValidationError[],
  ): void {
    try {
      this.assertPayloadSize(definition);
    } catch (error) {
      if (error instanceof AppException) {
        errors.push({
          code: error.code ?? ERROR_CODES.VALIDATION_ERROR,
          message: error.message,
          details: error.details as Record<string, unknown> | undefined,
        });
      } else {
        throw error;
      }
    }
  }

  private async assertAgentsAssignable(
    nodes: WorkflowNode[],
    errors: DefinitionValidationError[],
  ): Promise<void> {
    const uniqueCodes = [...new Set(nodes.map((node) => node.agentCode))];
    for (const agentCode of uniqueCodes) {
      try {
        await this.agentsService.assertAssignableByCode(agentCode);
      } catch (error) {
        if (error instanceof AppException) {
          errors.push({
            code: error.code ?? ERROR_CODES.WORKFLOW_INVALID_AGENT_REF,
            message: error.message,
            details: error.details as Record<string, unknown> | undefined,
          });
        } else {
          throw error;
        }
      }
    }
  }

  private isDuplicateId(
    id: string,
    seen: Set<string>,
    errors: DefinitionValidationError[],
    kind: 'node' | 'edge',
  ): boolean {
    if (!seen.has(id)) {
      seen.add(id);
      return false;
    }
    errors.push({
      code: ERROR_CODES.WORKFLOW_INVALID_GRAPH,
      message: `Duplicate ${kind} id: ${id}`,
      details: kind === 'node' ? { nodeId: id } : { edgeId: id },
    });
    return true;
  }

  private parseNode(
    item: unknown,
    index: number,
    errors: DefinitionValidationError[],
  ): WorkflowNode | null {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: `nodes[${index}] must be an object`,
      });
      return null;
    }

    const raw = item as Record<string, unknown>;
    const id = typeof raw.id === 'string' ? raw.id.trim() : '';
    if (!id) {
      errors.push({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: `nodes[${index}].id is required`,
      });
      return null;
    }

    if (raw.type !== 'agent') {
      errors.push({
        code: ERROR_CODES.WORKFLOW_INVALID_GRAPH,
        message: `nodes[${index}].type must be "agent"`,
        details: { nodeId: id },
      });
      return null;
    }

    const agentCode = typeof raw.agentCode === 'string' ? raw.agentCode.trim().toLowerCase() : '';
    if (!agentCode) {
      errors.push({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: `nodes[${index}].agentCode is required`,
        details: { nodeId: id },
      });
      return null;
    }

    const position = this.parseNodePosition(raw.position, index, id, errors);
    if (position === 'invalid') {
      return null;
    }

    return {
      id,
      type: 'agent',
      agentCode,
      agentVersion: this.optionalNumber(raw.agentVersion),
      label: this.optionalString(raw.label),
      position: position === 'absent' ? undefined : position,
      inputMapping: this.optionalObject(raw.inputMapping),
      outputMapping: this.optionalObject(raw.outputMapping),
      timeoutMs: this.optionalNumber(raw.timeoutMs),
      maxRetries: this.optionalNumber(raw.maxRetries),
      config: this.optionalObject(raw.config),
    };
  }

  private parseNodePosition(
    rawPosition: unknown,
    index: number,
    nodeId: string,
    errors: DefinitionValidationError[],
  ): WorkflowNodePosition | null | undefined | 'invalid' | 'absent' {
    if (rawPosition === undefined) {
      return 'absent';
    }
    if (rawPosition === null) {
      return null;
    }
    if (
      typeof rawPosition !== 'object' ||
      rawPosition === null ||
      Array.isArray(rawPosition) ||
      typeof (rawPosition as WorkflowNodePosition).x !== 'number' ||
      typeof (rawPosition as WorkflowNodePosition).y !== 'number'
    ) {
      errors.push({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: `nodes[${index}].position must be { x: number, y: number }`,
        details: { nodeId },
      });
      return 'invalid';
    }
    return {
      x: (rawPosition as WorkflowNodePosition).x,
      y: (rawPosition as WorkflowNodePosition).y,
    };
  }

  private parseEdge(
    item: unknown,
    index: number,
    errors: DefinitionValidationError[],
    nodeIds: Set<string>,
  ): WorkflowEdge | null {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: `edges[${index}] must be an object`,
      });
      return null;
    }

    const raw = item as Record<string, unknown>;
    const id = typeof raw.id === 'string' ? raw.id.trim() : '';
    const from = typeof raw.from === 'string' ? raw.from.trim() : '';
    const to = typeof raw.to === 'string' ? raw.to.trim() : '';

    if (!id || !from || !to) {
      errors.push({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: `edges[${index}] requires id, from, and to`,
      });
      return null;
    }

    if (raw.condition !== undefined && raw.condition !== null) {
      errors.push({
        code: ERROR_CODES.WORKFLOW_INVALID_GRAPH,
        message: `edges[${index}].condition must be null or omitted in MVP`,
        details: { edgeId: id },
      });
      return null;
    }

    if (from === to) {
      errors.push({
        code: ERROR_CODES.WORKFLOW_INVALID_GRAPH,
        message: 'Self-loop edges are not allowed',
        details: { edgeId: id, from, to },
      });
      return null;
    }

    if (!nodeIds.has(from) || !nodeIds.has(to)) {
      errors.push({
        code: ERROR_CODES.WORKFLOW_INVALID_GRAPH,
        message: 'Edge references a missing node',
        details: { edgeId: id, from, to },
      });
      return null;
    }

    return { id, from, to, condition: null };
  }

  private hasCycle(nodes: WorkflowNode[], edges: WorkflowEdge[]): boolean {
    const adjacency = new Map<string, string[]>();
    for (const node of nodes) {
      adjacency.set(node.id, []);
    }
    for (const edge of edges) {
      adjacency.get(edge.from)?.push(edge.to);
    }

    const visiting = new Set<string>();
    const visited = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      if (visiting.has(nodeId)) {
        return true;
      }
      if (visited.has(nodeId)) {
        return false;
      }
      visiting.add(nodeId);
      for (const next of adjacency.get(nodeId) ?? []) {
        if (dfs(next)) {
          return true;
        }
      }
      visiting.delete(nodeId);
      visited.add(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (dfs(node.id)) {
        return true;
      }
    }
    return false;
  }

  private optionalObject(value: unknown): Record<string, unknown> | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return { ...(value as Record<string, unknown>) };
    }
    return undefined;
  }

  private optionalNumber(value: unknown): number | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    return typeof value === 'number' ? value : undefined;
  }

  private optionalString(value: unknown): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    return typeof value === 'string' ? value : undefined;
  }
}
