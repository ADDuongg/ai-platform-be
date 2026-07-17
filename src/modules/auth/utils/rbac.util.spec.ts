import { collectPermissionCodes, collectRoleCodes } from './rbac.util';
import { PermissionEntity } from '../entities/permission.entity';
import { RoleEntity } from '../entities/role.entity';

describe('rbac.util', () => {
  it('collects unique role and permission codes', () => {
    const permissionA = { code: 'users:read' } as PermissionEntity;
    const permissionB = { code: 'users:create' } as PermissionEntity;
    const roles = [
      { code: 'admin', permissions: [permissionA, permissionB] },
      { code: 'viewer', permissions: [permissionA] },
    ] as RoleEntity[];

    expect(collectRoleCodes(roles)).toEqual(['admin', 'viewer']);
    expect(collectPermissionCodes(roles)).toEqual(['users:create', 'users:read']);
  });
});
