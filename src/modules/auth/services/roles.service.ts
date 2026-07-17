import { HttpStatus, Injectable } from '@nestjs/common';

import { ERROR_CODES, ROLES } from '@common/constants';
import { AppException, ForbiddenException, NotFoundException } from '@common/exceptions';

import { PermissionEntity } from '../entities/permission.entity';
import { RoleEntity } from '../entities/role.entity';
import { PermissionsRepository } from '../repositories/permissions.repository';
import { RolesRepository } from '../repositories/roles.repository';
import { collectPermissionCodes } from '../utils/rbac.util';

export interface RoleResponse {
  code: string;
  name: string;
  description: string | null;
  permissions: string[];
}

export interface PermissionResponse {
  code: string;
  resource: string;
  action: string;
  description?: string;
}

@Injectable()
export class RolesService {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly permissionsRepository: PermissionsRepository,
  ) {}

  async listRoles(): Promise<RoleResponse[]> {
    const roles = await this.rolesRepository.findAll();
    return roles.map((role) => this.toRoleResponse(role));
  }

  async listPermissions(): Promise<PermissionResponse[]> {
    const permissions = await this.permissionsRepository.findAll();
    return permissions.map((permission) => this.toPermissionResponse(permission));
  }

  async updateRolePermissions(
    roleCode: string,
    permissionCodes: string[],
    actorRoles: string[],
  ): Promise<RoleResponse> {
    if (!actorRoles.includes(ROLES.SUPER_ADMIN)) {
      throw new ForbiddenException('Only super_admin can update role permissions');
    }

    const role = await this.rolesRepository.findByCode(roleCode);
    if (!role) {
      throw new AppException('Role not found', HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.ROLE_NOT_FOUND,
      });
    }

    const permissions = await this.permissionsRepository.findByCodes(permissionCodes);
    if (permissions.length !== permissionCodes.length) {
      throw new NotFoundException('One or more permissions were not found');
    }

    role.permissions = permissions;
    const saved = await this.rolesRepository.save(role);
    return this.toRoleResponse(saved);
  }

  async resolveRolesByCodes(roleCodes: string[]): Promise<RoleEntity[]> {
    const roles = await this.rolesRepository.findByCodes(roleCodes);
    if (roles.length !== roleCodes.length) {
      const found = new Set(roles.map((r) => r.code));
      const missing = roleCodes.filter((code) => !found.has(code));
      throw new AppException(`Unknown roles: ${missing.join(', ')}`, HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.ROLE_NOT_FOUND,
        details: { missing },
      });
    }
    return roles;
  }

  private toRoleResponse(role: RoleEntity): RoleResponse {
    return {
      code: role.code,
      name: role.name,
      description: role.description,
      permissions: collectPermissionCodes([role]),
    };
  }

  private toPermissionResponse(permission: PermissionEntity): PermissionResponse {
    return {
      code: permission.code,
      resource: permission.resource,
      action: permission.action,
      // API field is `description`; entity column is `name` (display label).
      description: permission.name,
    };
  }
}
