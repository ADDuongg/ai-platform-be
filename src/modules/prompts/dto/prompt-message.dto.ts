import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum PromptMessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
}

export class PromptMessageDto {
  @ApiProperty({ enum: PromptMessageRole })
  @IsEnum(PromptMessageRole)
  role!: PromptMessageRole;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content!: string;
}
