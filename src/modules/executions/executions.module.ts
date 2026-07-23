import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AllConfigType } from '@common/config';

import { AgentsModule } from '../agents/agents.module';
import { AuditModule } from '../audit/audit.module';
import { PromptsModule } from '../prompts/prompts.module';
import { ToolsModule } from '../tools/tools.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import {
  AGENT_RUNNER,
  AGENT_RUNNER_MODES,
  EXECUTION_QUEUE,
  LLM_CHAT_PROVIDER,
  LLM_PROVIDER_REGISTRY,
  LIVE_LLM_PROVIDERS,
  TOOL_ADAPTER_REGISTRY,
  type AgentRunnerMode,
  type LlmProviderId,
} from './constants/executions.constants';
import { ExecutionsController } from './controllers/executions.controller';
import { ExecutionArtifactsController } from './controllers/execution-artifacts.controller';
import { WorkflowExecuteController } from './controllers/workflow-execute.controller';
import { ExecutionEntity } from './entities/execution.entity';
import { ExecutionArtifactEntity } from './entities/execution-artifact.entity';
import { ExecutionStepEntity } from './entities/execution-step.entity';
import { AnthropicChatProvider } from './llm/anthropic-chat.provider';
import { GeminiChatProvider } from './llm/gemini-chat.provider';
import { LlmAgentRunnerService } from './llm/llm-agent-runner.service';
import type { LlmChatProvider } from './llm/llm-chat.provider';
import { LlmProviderRegistry } from './llm/llm-provider.registry';
import { OllamaChatProvider } from './llm/ollama-chat.provider';
import { OpenAiChatProvider } from './llm/openai-chat.provider';
import { ExecutionProcessor } from './processors/execution.processor';
import { ExecutionStepsRepository } from './repositories/execution-steps.repository';
import { ExecutionArtifactsRepository } from './repositories/execution-artifacts.repository';
import { ExecutionsRepository } from './repositories/executions.repository';
import { ExecutionOrchestratorService } from './services/execution-orchestrator.service';
import { ExecutionsService } from './services/executions.service';
import { ExecutionArtifactsService } from './services/execution-artifacts.service';
import {
  ARTIFACT_BLOB_STORE,
  LocalArtifactBlobStore,
} from './services/artifact-blob-store';
import {
  ArtifactMaterializerService,
  defaultArtifactHttpFetcher,
} from './services/artifact-materializer.service';
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

function isLiveLlmProvider(mode: string): mode is LlmProviderId {
  return (LIVE_LLM_PROVIDERS as readonly string[]).includes(mode);
}

function resolveRunnerMode(config: ConfigService<AllConfigType>): AgentRunnerMode {
  const mode = (config.get('agentRunner', { infer: true })?.mode ?? 'stub').toLowerCase();
  if (!isAgentRunnerMode(mode)) {
    throw new Error(`Unsupported AGENT_RUNNER=${mode}. Use stub|ollama|openai|anthropic|gemini`);
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

function createLlmProviderRegistry(
  ollama: OllamaChatProvider,
  openai: OpenAiChatProvider,
  anthropic: AnthropicChatProvider,
  gemini: GeminiChatProvider,
): LlmProviderRegistry {
  return new LlmProviderRegistry([ollama, openai, anthropic, gemini]);
}

function createDefaultLlmChatProvider(
  config: ConfigService<AllConfigType>,
  registry: LlmProviderRegistry,
): LlmChatProvider {
  const mode = resolveRunnerMode(config);
  if (mode === 'stub' || !isLiveLlmProvider(mode)) {
    return registry.get('ollama');
  }
  return registry.get(mode);
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
    TypeOrmModule.forFeature([ExecutionEntity, ExecutionStepEntity, ExecutionArtifactEntity]),
    BullModule.registerQueue({ name: EXECUTION_QUEUE }),
    ConfigModule,
    WorkflowsModule,
    AgentsModule,
    PromptsModule,
    ToolsModule,
    AuditModule,
  ],
  controllers: [ExecutionsController, ExecutionArtifactsController, WorkflowExecuteController],
  providers: [
    ExecutionsService,
    ExecutionArtifactsService,
    ArtifactMaterializerService,
    LocalArtifactBlobStore,
    {
      provide: ARTIFACT_BLOB_STORE,
      useExisting: LocalArtifactBlobStore,
    },
    {
      provide: 'ARTIFACT_HTTP_FETCHER',
      useValue: defaultArtifactHttpFetcher,
    },
    ExecutionOrchestratorService,
    WorkflowEngineService,
    StubAgentRunnerService,
    OllamaChatProvider,
    OpenAiChatProvider,
    AnthropicChatProvider,
    GeminiChatProvider,
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
    {
      provide: LLM_PROVIDER_REGISTRY,
      inject: [OllamaChatProvider, OpenAiChatProvider, AnthropicChatProvider, GeminiChatProvider],
      useFactory: createLlmProviderRegistry,
    },
    {
      provide: LLM_CHAT_PROVIDER,
      inject: [ConfigService, LLM_PROVIDER_REGISTRY],
      useFactory: createDefaultLlmChatProvider,
    },
    LlmAgentRunnerService,
    {
      provide: AGENT_RUNNER,
      inject: [ConfigService, StubAgentRunnerService, LlmAgentRunnerService],
      useFactory: createAgentRunner,
    },
    ExecutionProcessor,
    ExecutionsRepository,
    ExecutionStepsRepository,
    ExecutionArtifactsRepository,
  ],
  exports: [ExecutionsService],
})
export class ExecutionsModule {}
