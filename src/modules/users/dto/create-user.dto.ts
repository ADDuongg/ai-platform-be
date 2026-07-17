import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

import { UserStatus } from '@common/enums';

export class CreateUserDto {
  @ApiProperty({ example: 'designer@ai-platform.local' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ enum: UserStatus, default: UserStatus.ACTIVE })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({
    type: [String],
    description: 'Omit to default to viewer',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleCodes?: string[];
}
