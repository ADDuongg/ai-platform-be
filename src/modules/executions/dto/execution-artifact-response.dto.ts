import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

import { ArtifactKind, ArtifactPersist, ArtifactStatus } from '../enums';

@Exclude()
export class ExecutionArtifactResponseDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty()
  executionId!: string;

  @Expose()
  @ApiProperty()
  key!: string;

  @Expose()
  @ApiProperty({ enum: ArtifactKind })
  kind!: ArtifactKind;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  label!: string | null;

  @Expose()
  @ApiProperty({ enum: ArtifactPersist })
  persist!: ArtifactPersist;

  @Expose()
  @ApiProperty({ enum: ArtifactStatus })
  status!: ArtifactStatus;

  @Expose()
  @ApiPropertyOptional({ nullable: true, type: 'object', additionalProperties: true })
  contentJson!: Record<string, unknown> | null;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  storageKey!: string | null;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  contentType!: string | null;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  byteSize!: number | null;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  sourceNodeId!: string | null;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  errorMessage!: string | null;

  @Expose()
  @ApiProperty()
  createdAt!: Date;
}
