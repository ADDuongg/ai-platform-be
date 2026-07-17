import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AllConfigType } from '@common/config';

import { AgentsModule } from '../agents/agents.module';
import { PromptsModule } from '../prompts/prompts.module';
import { ToolsModule } from '../tools/tools.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import {
  AGENT_RUNNER,
  AGENT_RUNNER_MODES,
  EXECUTION_QUEUE,
  LLM_CHAT_PROVIDER,
  TOOL_ADAPTER_REGISTRY,
  type AgentRunnerMode,
} from './constants/executions.constants';
import { ExecutionsController } from './controllers/executions.controller';
import { WorkflowExecuteController } from './controllers/workflow-execute.controller';
import { ExecutionEntity } from './entities/execution.entity';
import { ExecutionStepEntity } from './entities/execution-step.entity';
import { GeminiChatProvider } from './llm/gemini-chat.provider';
import { LlmAgentRunnerService } from './llm/llm-agent-runner.service';
import type { LlmChatProvider } from './llm/llm-chat.provider';
import { OllamaChatProvider } from './llm/ollama-chat.provider';
import { OpenAiChatProvider } from './llm/openai-chat.provider';
import { ExecutionProcessor } from './processors/execution.processor';
import { ExecutionStepsRepository } from './repositories/execution-steps.repository';
import { ExecutionsRepository } from './repositories/executions.repository';
import { ExecutionOrchestratorService } from './services/execution-orchestrator.service';
import { ExecutionsService } from './services/executions.service';
import type { AgentRunner } from './services/agent-runner.types';
import { StubAgentRunnerService } from './services/stub-agent-runner.service';
import { WorkflowEngineService } from './services/workflow-engine.service';
import { ImageGenerationAdapter } from './tools/adapters/image-generation.adapter';
import { ObjectStorageAdapter } from './tools/adapters/object-storage.adapter';
import { WebBrowserAdapter } from './tools/adapters/web-browser.adapter';
import { WebSearchAdapter } from './tools/adapters/web-search.adapter';
import { ToolAdapterRegistry } from './tools/tool-registry';
import { ToolInvokerService } from './tools/tool-invoker.service';

function isAgentRunnerMode(mode: string): mode is AgentRunnerMode {
  return (AGENT_RUNNER_MODES as readonly string[]).includes(mode);
}

function resolveRunnerMode(config: ConfigService<AllConfigType>): AgentRunnerMode {
  const mode = (config.get('agentRunner', { infer: true })?.mode ?? 'stub').toLowerCase();
  if (!isAgentRunnerMode(mode)) {
    throw new Error(`Unsupported AGENT_RUNNER=${mode}. Use stub|ollama|openai|gemini`);
  }
  return mode;
}

function createToolAdapterRegistry(
  webSearch: WebSearchAdapter,
  webBrowser: WebBrowserAdapter,
  imageGen: ImageGenerationAdapter,
  objectStorage: ObjectStorageAdapter,
): ToolAdapterRegistry {
  return new ToolAdapterRegistry([webSearch, webBrowser, imageGen, objectStorage]);
}

function createLlmChatProvider(
  config: ConfigService<AllConfigType>,
  ollama: OllamaChatProvider,
): LlmChatProvider {
  const mode = resolveRunnerMode(config);
  if (mode === 'stub' || mode === 'ollama') {
    return ollama;
  }
  if (mode === 'openai') {
    return new OpenAiChatProvider();
  }
  if (mode === 'gemini') {
    return new GeminiChatProvider();
  }
  throw new Error(`Unsupported AGENT_RUNNER=${mode}. Use stub|ollama|openai|gemini`);
}

function createAgentRunner(
  config: ConfigService<AllConfigType>,
  stub: StubAgentRunnerService,
  llm: LlmAgentRunnerService,
): AgentRunner {
  const mode = resolveRunnerMode(config);
  return mode === 'stub' ? stub : llm;
}

@Module({
  imports: [
    TypeOrmModule.forFeature([ExecutionEntity, ExecutionStepEntity]),
    BullModule.registerQueue({ name: EXECUTION_QUEUE }),
    ConfigModule,
    WorkflowsModule,
    AgentsModule,
    PromptsModule,
    ToolsModule,
  ],
  controllers: [ExecutionsController, WorkflowExecuteController],
  providers: [
    ExecutionsService,
    ExecutionOrchestratorService,
    WorkflowEngineService,
    StubAgentRunnerService,
    OllamaChatProvider,
    WebSearchAdapter,
    WebBrowserAdapter,
    ImageGenerationAdapter,
    ObjectStorageAdapter,
    {
      provide: TOOL_ADAPTER_REGISTRY,
      inject: [WebSearchAdapter, WebBrowserAdapter, ImageGenerationAdapter, ObjectStorageAdapter],
      useFactory: createToolAdapterRegistry,
    },
    ToolInvokerService,
    LlmAgentRunnerService,
    {
      provide: LLM_CHAT_PROVIDER,
      inject: [ConfigService, OllamaChatProvider],
      useFactory: createLlmChatProvider,
    },
    {
      provide: AGENT_RUNNER,
      inject: [ConfigService, StubAgentRunnerService, LlmAgentRunnerService],
      useFactory: createAgentRunner,
    },
    ExecutionProcessor,
    ExecutionsRepository,
    ExecutionStepsRepository,
  ],
  exports: [ExecutionsService],
})
export class ExecutionsModule {}
