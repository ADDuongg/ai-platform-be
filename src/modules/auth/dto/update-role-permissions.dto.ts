import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class UpdateRolePermissionsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(0)
  @IsString({ each: true })
  permissionCodes!: string[];
}
