import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

import { ExecutionStatus } from '../enums';

@Exclude()
export class ExecutionResponseDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty()
  workflowId!: string;

  @Expose()
  @ApiProperty()
  workflowCode!: string;

  @Expose()
  @ApiProperty()
  workflowVersion!: number;

  @Expose()
  @ApiProperty({ enum: ExecutionStatus })
  status!: ExecutionStatus;

  @Expose()
  @ApiProperty({ type: 'object', additionalProperties: true })
  input!: Record<string, unknown>;

  @Expose()
  @ApiProperty({ type: 'object', additionalProperties: true })
  context!: Record<string, unknown>;

  @Expose()
  @ApiPropertyOptional({ nullable: true, type: 'object', additionalProperties: true })
  error!: Record<string, unknown> | null;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  startedBy!: string | null;

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
