import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class NodePositionDto {
  @ApiProperty()
  @IsNumber()
  x!: number;

  @ApiProperty()
  @IsNumber()
  y!: number;
}

export class AddWorkflowNodeDto {
  @ApiPropertyOptional({ description: 'Stable node id; server generates UUID if omitted' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  id?: string;

  @ApiProperty({ example: 'research-agent' })
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  agentCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  agentVersion?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @ApiPropertyOptional({ type: NodePositionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NodePositionDto)
  position?: NodePositionDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  inputMapping?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  outputMapping?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  timeoutMs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  maxRetries?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
