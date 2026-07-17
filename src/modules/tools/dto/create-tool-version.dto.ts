import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateToolVersionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  changelog?: string;
}
