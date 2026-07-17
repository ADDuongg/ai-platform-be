import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

import { ToolStatus, ToolType } from '../enums';

@Exclude()
export class ToolResponseDto {
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
  @ApiProperty({ enum: ToolType })
  toolType!: ToolType;

  @Expose()
  @ApiProperty({ enum: ToolStatus })
  status!: ToolStatus;

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
