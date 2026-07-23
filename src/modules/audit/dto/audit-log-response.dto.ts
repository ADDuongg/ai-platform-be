import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class AuditLogResponseDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty()
  domain!: string;

  @Expose()
  @ApiProperty()
  action!: string;

  @Expose()
  @ApiProperty()
  resourceType!: string;

  @Expose()
  @ApiProperty()
  resourceId!: string;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  resourceCode!: string | null;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  actorUserId!: string | null;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  ip!: string | null;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  userAgent!: string | null;

  @Expose()
  @ApiPropertyOptional({ nullable: true, type: Object })
  metadata!: Record<string, unknown> | null;

  @Expose()
  @ApiProperty()
  createdAt!: Date;
}
