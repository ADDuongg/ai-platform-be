import { ApiPropertyOptional } from '@nestjs/swagger';
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
  ValidateIf,
  ValidateNested,
} from 'class-validator';

class NodePositionDto {
  @ApiPropertyOptional()
  @IsNumber()
  x!: number;

  @ApiPropertyOptional()
  @IsNumber()
  y!: number;
}

export class UpdateWorkflowNodeDto {
  @ApiPropertyOptional({ example: 'review-agent' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  agentCode?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  agentVersion?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(120)
  label?: string | null;

  @ApiPropertyOptional({ type: NodePositionDto, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @ValidateNested()
  @Type(() => NodePositionDto)
  position?: NodePositionDto | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  inputMapping?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  outputMapping?: Record<string, unknown>;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  timeoutMs?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(0)
  maxRetries?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
