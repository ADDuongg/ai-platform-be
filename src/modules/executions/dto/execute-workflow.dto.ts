import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsObject, IsOptional, IsUUID, Min } from 'class-validator';

export class ExecuteWorkflowDto {
  @ApiPropertyOptional({ minimum: 1, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, default: {} })
  @IsOptional()
  @IsObject()
  input?: Record<string, unknown>;
}

export class CreateExecutionDto extends ExecuteWorkflowDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  workflowId!: string;
}
