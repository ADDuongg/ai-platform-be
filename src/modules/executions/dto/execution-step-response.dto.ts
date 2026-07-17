import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

import { ExecutionStepStatus } from '../enums';

@Exclude()
export class ExecutionStepResponseDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty()
  executionId!: string;

  @Expose()
  @ApiProperty()
  nodeId!: string;

  @Expose()
  @ApiProperty()
  agentCode!: string;

  @Expose()
  @ApiProperty()
  agentVersion!: number;

  @Expose()
  @ApiProperty({ enum: ExecutionStepStatus })
  status!: ExecutionStepStatus;

  @Expose()
  @ApiProperty()
  attempt!: number;

  @Expose()
  @ApiProperty()
  maxRetries!: number;

  @Expose()
  @ApiPropertyOptional({ nullable: true, type: 'object', additionalProperties: true })
  input!: Record<string, unknown> | null;

  @Expose()
  @ApiPropertyOptional({ nullable: true, type: 'object', additionalProperties: true })
  output!: Record<string, unknown> | null;

  @Expose()
  @ApiPropertyOptional({ nullable: true, type: 'object', additionalProperties: true })
  error!: Record<string, unknown> | null;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  startedAt!: Date | null;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  completedAt!: Date | null;

  @Expose()
  @ApiProperty()
  createdAt!: Date;

  @Expose()
  @ApiProperty()
  updatedAt!: Date;
}
