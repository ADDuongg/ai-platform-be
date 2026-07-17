import { ApiProperty } from '@nestjs/swagger';

export class AuthTokenResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ example: 'Bearer', required: false })
  tokenType?: string;

  @ApiProperty()
  expiresIn!: number;
}

export class MeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ type: [String] })
  roles!: string[];

  @ApiProperty({ type: [String] })
  permissions!: string[];

  @ApiProperty({ nullable: true })
  lastLoginAt!: Date | null;
}
