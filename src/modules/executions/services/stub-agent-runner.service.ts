import { Injectable } from '@nestjs/common';

import type { AgentRunner, AgentRunnerInvokeInput } from './agent-runner.types';
import { resolveFashionFixture } from './stub-agent.fixtures';

export type { AgentRunner, AgentRunnerInvokeInput } from './agent-runner.types';

/**
 * Deterministic MVP runner. Supports forced failures via config:
 * - `failAttempts`: number — fail while attempt <= failAttempts
 * - `failAlways`: boolean — always fail
 *
 * Fashion Milestone 2 agents return structured fixtures for Trend Research,
 * Reference Image, Style Analysis, Design Brief, and Image Generation Workflow demos.
 */
@Injectable()
export class StubAgentRunnerService implements AgentRunner {
  async invoke(params: AgentRunnerInvokeInput): Promise<Record<string, unknown>> {
    const config = params.config ?? {};
    const failAlways = config.failAlways === true;
    const failAttempts = typeof config.failAttempts === 'number' ? Number(config.failAttempts) : 0;

    if (failAlways || params.attempt <= failAttempts) {
      throw new Error(
        `Stub agent forced failure for ${params.agentCode} attempt=${params.attempt}`,
      );
    }

    const fashion = resolveFashionFixture(params);
    if (fashion) {
      return fashion;
    }

    return {
      ...params.input,
      _agent: params.agentCode,
      _agentVersion: params.agentVersion,
      _nodeId: params.nodeId,
      result: `stub:${params.agentCode}`,
    };
  }
}
