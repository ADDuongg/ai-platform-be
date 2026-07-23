import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class LlmModelDto {
  @ApiProperty({ example: 'gpt-4o' })
  id!: string;

  @ApiProperty({ example: 'GPT-4o' })
  label!: string;
}

export class LlmProviderDto {
  @ApiProperty({ example: 'openai', enum: ['openai', 'anthropic', 'ollama', 'gemini'] })
  id!: string;

  @ApiProperty({ example: 'OpenAI' })
  label!: string;

  @ApiProperty({ example: 'gpt-4o-mini' })
  defaultModel!: string;

  @ApiProperty({
    description: 'True when provider credentials/base URL are present in env',
    example: false,
  })
  configured!: boolean;

  @ApiProperty({ type: [LlmModelDto] })
  models!: LlmModelDto[];
}

export class ListLlmModelsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter models by provider id',
    enum: ['openai', 'anthropic', 'ollama', 'gemini'],
    example: 'openai',
  })
  @IsOptional()
  @IsString()
  provider?: string;
}
