import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class UpdateUserRolesDto {
  @ApiProperty({ type: [String], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  roleCodes!: string[];
}
