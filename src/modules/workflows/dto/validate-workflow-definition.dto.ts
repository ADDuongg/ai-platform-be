import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

export class ValidateWorkflowDefinitionDto {
  @ApiPropertyOptional({
    description: 'Proposed definition; omit to validate the current draft/published definition',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  definition?: Record<string, unknown>;
}
