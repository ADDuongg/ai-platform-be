import { UserEntity } from '@modules/users/entities/user.entity';

import { RoleEntity } from '../entities/role.entity';

export function collectRoleCodes(roles: RoleEntity[] | undefined): string[] {
  return [...new Set((roles ?? []).map((role) => role.code))];
}

export function collectPermissionCodes(roles: RoleEntity[] | undefined): string[] {
  const permissions = new Set<string>();
  for (const role of roles ?? []) {
    for (const permission of role.permissions ?? []) {
      permissions.add(permission.code);
    }
  }
  return [...permissions].sort();
}

export function getUserRoleCodes(user: UserEntity): string[] {
  return collectRoleCodes(user.roles);
}

export function getUserPermissionCodes(user: UserEntity): string[] {
  return collectPermissionCodes(user.roles);
}
