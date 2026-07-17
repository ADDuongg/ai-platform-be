import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

import { PromptVersionStatus } from '../enums';

@Exclude()
export class PromptVersionResponseDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty()
  promptId!: string;

  @Expose()
  @ApiProperty()
  version!: number;

  @Expose()
  @ApiProperty({ enum: PromptVersionStatus })
  status!: PromptVersionStatus;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  template!: string | null;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  messages!: Array<{ role: string; content: string }> | null;

  @Expose()
  @ApiProperty({ type: 'object', additionalProperties: true })
  variablesSchema!: Record<string, unknown>;

  @Expose()
  @ApiProperty({ type: 'object', additionalProperties: true })
  modelHints!: Record<string, unknown>;

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
