import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

import { ToolVersionStatus } from '../enums';

@Exclude()
export class ToolVersionResponseDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty()
  toolId!: string;

  @Expose()
  @ApiProperty()
  version!: number;

  @Expose()
  @ApiProperty({ enum: ToolVersionStatus })
  status!: ToolVersionStatus;

  @Expose()
  @ApiProperty({ type: 'object', additionalProperties: true })
  config!: Record<string, unknown>;

  @Expose()
  @ApiProperty({ type: 'object', additionalProperties: true })
  inputSchema!: Record<string, unknown>;

  @Expose()
  @ApiProperty({ type: 'object', additionalProperties: true })
  outputSchema!: Record<string, unknown>;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  secretRef!: string | null;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  timeoutMs!: number | null;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  maxRetries!: number | null;

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
