import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateWorkflowDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Replaces draft version definition shell',
  })
  @IsOptional()
  @IsObject()
  definition?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  changelog?: string;
}
