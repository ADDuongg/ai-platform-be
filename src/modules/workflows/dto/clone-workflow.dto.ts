import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

const CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CloneWorkflowDto {
  @ApiProperty({ example: 'kids-fashion-research-copy' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Matches(CODE_PATTERN, {
    message: 'code must be a lowercase slug (a-z, 0-9, hyphens)',
  })
  code!: string;

  @ApiPropertyOptional({ description: 'Override name; defaults to source name + (copy)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    description: 'Source version number; defaults to current published or draft',
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number;
}
