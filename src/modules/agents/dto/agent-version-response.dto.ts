import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

import { AgentVersionStatus } from '../enums';

@Exclude()
export class AgentVersionResponseDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty()
  agentId!: string;

  @Expose()
  @ApiProperty()
  version!: number;

  @Expose()
  @ApiProperty({ enum: AgentVersionStatus })
  status!: AgentVersionStatus;

  @Expose()
  @ApiProperty({ type: 'object', additionalProperties: true })
  inputSchema!: Record<string, unknown>;

  @Expose()
  @ApiProperty({ type: 'object', additionalProperties: true })
  outputSchema!: Record<string, unknown>;

  @Expose()
  @ApiProperty({ type: 'object', additionalProperties: true })
  config!: Record<string, unknown>;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  timeoutMs!: number | null;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  maxRetries!: number | null;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  promptRef!: string | null;

  @Expose()
  @ApiProperty({ type: [String] })
  toolRefs!: string[];

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
