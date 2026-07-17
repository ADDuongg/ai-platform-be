import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';

import { Role } from '@common/constants';
import { UserStatus } from '@common/enums';

@Exclude()
export class UserResponseDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty()
  email!: string;

  @Expose()
  @ApiProperty()
  firstName!: string;

  @Expose()
  @ApiProperty()
  lastName!: string;

  @Expose()
  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @Expose()
  @Transform(({ obj }) => {
    const roles = obj?.roles;
    if (!Array.isArray(roles)) {
      return [];
    }
    return roles.map((role: { code?: string } | string) =>
      typeof role === 'string' ? role : role.code,
    );
  })
  @ApiProperty({ type: [String] })
  roles!: Role[];

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  lastLoginAt!: Date | null;

  @Expose()
  @ApiProperty()
  createdAt!: Date;

  @Expose()
  @ApiProperty()
  updatedAt!: Date;
}
