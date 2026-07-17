import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreatePromptVersionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  changelog?: string;
}
