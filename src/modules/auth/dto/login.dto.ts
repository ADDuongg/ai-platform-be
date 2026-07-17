import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@ai-platform.local' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'ChangeMe123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;
}
