import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
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

import { ToolType } from '../enums';

const CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateToolDto {
  @ApiProperty({ example: 'web-search' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Matches(CODE_PATTERN, {
    message: 'code must be a lowercase slug (a-z, 0-9, hyphens)',
  })
  code!: string;

  @ApiProperty({ example: 'Web Search' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ToolType })
  @IsEnum(ToolType)
  toolType!: ToolType;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  inputSchema?: Record<string, unknown>;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  outputSchema?: Record<string, unknown>;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(255)
  secretRef?: string | null;

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
  @IsString()
  changelog?: string;
}
