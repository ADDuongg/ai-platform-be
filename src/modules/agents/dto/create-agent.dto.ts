import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

import { CapabilityType } from '../enums';

const CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateAgentDto {
  @ApiProperty({ example: 'trend-research' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Matches(CODE_PATTERN, {
    message: 'code must be a lowercase slug (a-z, 0-9, hyphens)',
  })
  code!: string;

  @ApiProperty({ example: 'Trend Research' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: CapabilityType })
  @IsEnum(CapabilityType)
  capabilityType!: CapabilityType;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  inputSchema!: Record<string, unknown>;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  outputSchema!: Record<string, unknown>;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  timeoutMs?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxRetries?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(128)
  promptRef?: string | null;

  @ApiPropertyOptional({ type: [String], maxItems: 20 })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  toolRefs?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  changelog?: string;
}
