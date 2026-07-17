import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateWorkflowDto {
  @ApiProperty({ example: 'kids-fashion-research' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Matches(CODE_PATTERN, {
    message: 'code must be a lowercase slug (a-z, 0-9, hyphens)',
  })
  code!: string;

  @ApiProperty({ example: 'Kids Fashion Research' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'fashion' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @ApiPropertyOptional({ type: [String], example: ['demo', 'fashion'] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Definition shell; defaults to empty nodes/edges',
  })
  @IsOptional()
  @IsObject()
  definition?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  changelog?: string;
}
