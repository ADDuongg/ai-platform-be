import { WorkflowEngineService } from './workflow-engine.service';
import { ExecutionStepStatus } from '../enums';
import type { WorkflowDefinition } from '@modules/workflows/types';
import { applyInputMapping, applyOutputMapping, getByPath } from './context-mapper';

describe('WorkflowEngineService', () => {
  const engine = new WorkflowEngineService();

  const definition: WorkflowDefinition = {
    nodes: [
      { id: 'a', type: 'agent', agentCode: 'research-agent' },
      { id: 'b', type: 'agent', agentCode: 'review-agent' },
      { id: 'c', type: 'agent', agentCode: 'review-agent' },
    ],
    edges: [
      { id: 'e1', from: 'a', to: 'b', condition: null },
      { id: 'e2', from: 'a', to: 'c', condition: null },
    ],
    variables: {},
    policies: {},
  };

  it('returns root nodes as ready when pending', () => {
    const ready = engine.resolveReadyNodeIds(definition, [
      { nodeId: 'a', status: ExecutionStepStatus.PENDING },
      { nodeId: 'b', status: ExecutionStepStatus.PENDING },
      { nodeId: 'c', status: ExecutionStepStatus.PENDING },
    ]);
    expect(ready).toEqual(['a']);
  });

  it('returns independent children after predecessor completes', () => {
    const ready = engine.resolveReadyNodeIds(definition, [
      { nodeId: 'a', status: ExecutionStepStatus.COMPLETED },
      { nodeId: 'b', status: ExecutionStepStatus.PENDING },
      { nodeId: 'c', status: ExecutionStepStatus.PENDING },
    ]);
    expect(ready.sort()).toEqual(['b', 'c']);
  });

  it('does not start child before predecessor completes', () => {
    const ready = engine.resolveReadyNodeIds(definition, [
      { nodeId: 'a', status: ExecutionStepStatus.RUNNING },
      { nodeId: 'b', status: ExecutionStepStatus.PENDING },
      { nodeId: 'c', status: ExecutionStepStatus.PENDING },
    ]);
    expect(ready).toEqual([]);
  });
});

describe('context-mapper', () => {
  it('resolves dot paths', () => {
    expect(getByPath({ a: { b: 1 } }, 'a.b')).toBe(1);
  });

  it('maps input from context', () => {
    const input = applyInputMapping({ topic: 'x', other: 1 }, { q: 'topic' });
    expect(input).toEqual({ q: 'x' });
  });

  it('merges output when mapping empty', () => {
    const next = applyOutputMapping({ a: 1 }, { b: 2 }, {});
    expect(next).toEqual({ a: 1, b: 2 });
  });

  it('applies output mapping paths', () => {
    const next = applyOutputMapping({}, { result: 'ok' }, { research: 'result' });
    expect(next).toEqual({ research: 'ok' });
  });
});
