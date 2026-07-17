import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

import { PromptStatus } from '../enums';

@Exclude()
export class PromptResponseDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty()
  code!: string;

  @Expose()
  @ApiProperty()
  name!: string;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  category!: string | null;

  @Expose()
  @ApiProperty({ type: [String] })
  tags!: string[];

  @Expose()
  @ApiProperty({ enum: PromptStatus })
  status!: PromptStatus;

  @Expose()
  @ApiProperty()
  enabled!: boolean;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  currentVersion!: number | null;

  @Expose()
  @ApiPropertyOptional({
    nullable: true,
    description: 'Present for admins when a parallel draft version exists',
  })
  draftVersion?: number | null;

  @Expose()
  @ApiProperty()
  createdAt!: Date;

  @Expose()
  @ApiProperty()
  updatedAt!: Date;
}
