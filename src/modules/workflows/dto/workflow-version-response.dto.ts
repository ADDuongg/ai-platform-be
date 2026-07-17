import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

import { WorkflowVersionStatus } from '../enums';

@Exclude()
export class WorkflowVersionResponseDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty()
  workflowId!: string;

  @Expose()
  @ApiProperty()
  version!: number;

  @Expose()
  @ApiProperty({ enum: WorkflowVersionStatus })
  status!: WorkflowVersionStatus;

  @Expose()
  @ApiProperty({ type: 'object', additionalProperties: true })
  definition!: Record<string, unknown>;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  changelog!: string | null;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  publishedAt!: Date | null;

  @Expose()
  @ApiProperty()
  createdAt!: Date;
}
