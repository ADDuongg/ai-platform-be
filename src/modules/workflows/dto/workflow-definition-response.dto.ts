import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

import type { WorkflowDefinition } from '../types';

export class WorkflowDefinitionResponseDto {
  @ApiProperty()
  @Expose()
  workflowId!: string;

  @ApiProperty()
  @Expose()
  version!: number;

  @ApiProperty({ enum: ['draft', 'published'] })
  @Expose()
  versionStatus!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @Expose()
  definition!: WorkflowDefinition;
}

export class WorkflowDefinitionValidationResponseDto {
  @ApiProperty()
  @Expose()
  valid!: boolean;

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  @Expose()
  errors!: Array<{ code: string; message: string; details?: Record<string, unknown> }>;
}
