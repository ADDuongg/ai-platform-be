import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateWorkflowVersionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  changelog?: string;
}
