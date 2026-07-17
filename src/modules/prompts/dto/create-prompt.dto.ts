import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { PromptMessageDto } from './prompt-message.dto';

const CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreatePromptDto {
  @ApiProperty({ example: 'research-brief' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Matches(CODE_PATTERN, {
    message: 'code must be a lowercase slug (a-z, 0-9, hyphens)',
  })
  code!: string;

  @ApiProperty({ example: 'Research Brief' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(64)
  category?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(32, { each: true })
  @ArrayMaxSize(20)
  tags?: string[];

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  template?: string | null;

  @ApiPropertyOptional({ type: [PromptMessageDto], nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PromptMessageDto)
  messages?: PromptMessageDto[] | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  variablesSchema?: Record<string, unknown>;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  modelHints?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  changelog?: string;
}
