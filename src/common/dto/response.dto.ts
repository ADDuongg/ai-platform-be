import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiErrorDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  message!: string;

  @ApiPropertyOptional({ nullable: true })
  details!: unknown;
}

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success!: false;

  @ApiProperty({ type: ApiErrorDto })
  error!: ApiErrorDto;

  @ApiProperty()
  timestamp!: string;

  @ApiProperty()
  path!: string;
}

export class SuccessResponseDto<T = unknown> {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty()
  data!: T;

  @ApiPropertyOptional()
  meta?: Record<string, unknown>;
}

export class PaginationMetaDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;

  @ApiProperty()
  hasNextPage!: boolean;

  @ApiProperty()
  hasPreviousPage!: boolean;
}

export class CursorPaginationMetaDto {
  @ApiPropertyOptional({ nullable: true })
  nextCursor!: string | null;

  @ApiProperty()
  hasMore!: boolean;

  @ApiProperty()
  limit!: number;
}
