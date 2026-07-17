import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

import { AgentStatus, CapabilityType } from '../enums';

@Exclude()
export class AgentResponseDto {
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
  @ApiProperty({ enum: CapabilityType })
  capabilityType!: CapabilityType;

  @Expose()
  @ApiProperty({ enum: AgentStatus })
  status!: AgentStatus;

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
