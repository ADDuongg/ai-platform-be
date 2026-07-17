import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReplaceWorkflowDefinitionDto {
  @ApiProperty({
    description: 'Full draft definition (nodes, edges, variables, policies)',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  definition!: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  changelog?: string;
}
