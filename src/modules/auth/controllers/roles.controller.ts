import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser, JwtPayload, Permissions } from '@common/decorators';
import { PERMISSIONS } from '@common/constants';

import { UpdateRolePermissionsDto } from '../dto/update-role-permissions.dto';
import { RolesService } from '../services/roles.service';

@ApiTags('Roles')
@ApiBearerAuth('JWT')
@Controller({ path: '', version: '1' })
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('roles')
  @Permissions(PERMISSIONS.USERS.READ, PERMISSIONS.ROLES.MANAGE)
  @ApiOperation({ summary: 'List roles' })
  @ApiOkResponse({ description: 'Role list' })
  async listRoles() {
    return { data: await this.rolesService.listRoles() };
  }

  @Get('permissions')
  @Permissions(PERMISSIONS.ROLES.MANAGE)
  @ApiOperation({ summary: 'List permissions' })
  async listPermissions() {
    return { data: await this.rolesService.listPermissions() };
  }

  @Put('roles/:code/permissions')
  @Permissions(PERMISSIONS.ROLES.MANAGE)
  @ApiOperation({ summary: 'Replace role permission mapping (super_admin)' })
  async updateRolePermissions(
    @Param('code') code: string,
    @Body() dto: UpdateRolePermissionsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.rolesService.updateRolePermissions(code, dto.permissionCodes, user.roles);
  }
}
