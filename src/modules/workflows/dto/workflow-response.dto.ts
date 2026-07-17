import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

import { WorkflowStatus } from '../enums';

@Exclude()
export class WorkflowResponseDto {
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
  @ApiProperty({ enum: WorkflowStatus })
  status!: WorkflowStatus;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  currentVersion!: number | null;

  @Expose()
  @ApiPropertyOptional({
    nullable: true,
    description: 'Present for mutate roles when a parallel draft version exists',
  })
  draftVersion?: number | null;

  @Expose()
  @ApiProperty()
  createdAt!: Date;

  @Expose()
  @ApiProperty()
  updatedAt!: Date;
}
