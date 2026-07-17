import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AddWorkflowEdgeDto {
  @ApiPropertyOptional({ description: 'Stable edge id; server generates UUID if omitted' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  id?: string;

  @ApiProperty({ description: 'Source node id' })
  @IsString()
  @MaxLength(64)
  from!: string;

  @ApiProperty({ description: 'Target node id' })
  @IsString()
  @MaxLength(64)
  to!: string;
}
