import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateAgentVersionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  changelog?: string;
}
