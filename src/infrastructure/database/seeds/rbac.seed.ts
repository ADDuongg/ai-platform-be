import { ALL_PERMISSIONS, PERMISSIONS, ROLES } from '@common/constants';
import { UserStatus } from '@common/enums';
import { hashPassword } from '@common/utils';

import { PermissionEntity } from '@modules/auth/entities/permission.entity';
import { RoleEntity } from '@modules/auth/entities/role.entity';
import { UserEntity } from '@modules/users/entities/user.entity';

import AppDataSource from '../data-source';

const ROLE_DEFINITIONS: Array<{
  code: string;
  name: string;
  description: string;
  permissions: string[];
}> = [
  {
    code: ROLES.SUPER_ADMIN,
    name: 'Super Admin',
    description: 'Full platform access including role management',
    permissions: [...ALL_PERMISSIONS],
  },
  {
    code: ROLES.ADMIN,
    name: 'Admin',
    description: 'Platform administration without roles:manage',
    permissions: [
      PERMISSIONS.USERS.CREATE,
      PERMISSIONS.USERS.READ,
      PERMISSIONS.USERS.UPDATE,
      PERMISSIONS.USERS.DELETE,
      PERMISSIONS.WORKFLOWS.CREATE,
      PERMISSIONS.WORKFLOWS.READ,
      PERMISSIONS.WORKFLOWS.UPDATE,
      PERMISSIONS.WORKFLOWS.DELETE,
      PERMISSIONS.WORKFLOWS.PUBLISH,
      PERMISSIONS.WORKFLOWS.EXECUTE,
      PERMISSIONS.AGENTS.CREATE,
      PERMISSIONS.AGENTS.READ,
      PERMISSIONS.AGENTS.UPDATE,
      PERMISSIONS.AGENTS.DELETE,
      PERMISSIONS.AGENTS.PUBLISH,
      PERMISSIONS.PROMPTS.CREATE,
      PERMISSIONS.PROMPTS.READ,
      PERMISSIONS.PROMPTS.UPDATE,
      PERMISSIONS.PROMPTS.DELETE,
      PERMISSIONS.PROMPTS.PUBLISH,
      PERMISSIONS.TOOLS.CREATE,
      PERMISSIONS.TOOLS.READ,
      PERMISSIONS.TOOLS.UPDATE,
      PERMISSIONS.TOOLS.DELETE,
      PERMISSIONS.TOOLS.PUBLISH,
      PERMISSIONS.EXECUTIONS.CREATE,
      PERMISSIONS.EXECUTIONS.READ,
      PERMISSIONS.EXECUTIONS.CANCEL,
      PERMISSIONS.EXECUTIONS.RETRY,
      PERMISSIONS.AUDIT.READ,
    ],
  },
  {
    code: ROLES.DESIGNER,
    name: 'Designer',
    description: 'Build and execute workflows',
    permissions: [
      PERMISSIONS.WORKFLOWS.CREATE,
      PERMISSIONS.WORKFLOWS.READ,
      PERMISSIONS.WORKFLOWS.UPDATE,
      PERMISSIONS.WORKFLOWS.DELETE,
      PERMISSIONS.WORKFLOWS.PUBLISH,
      PERMISSIONS.WORKFLOWS.EXECUTE,
      PERMISSIONS.AGENTS.READ,
      PERMISSIONS.PROMPTS.READ,
      PERMISSIONS.TOOLS.READ,
      PERMISSIONS.EXECUTIONS.CREATE,
      PERMISSIONS.EXECUTIONS.READ,
      PERMISSIONS.EXECUTIONS.CANCEL,
      PERMISSIONS.EXECUTIONS.RETRY,
    ],
  },
  {
    code: ROLES.OPERATOR,
    name: 'Operator',
    description: 'Run published workflows and view history',
    permissions: [
      PERMISSIONS.WORKFLOWS.READ,
      PERMISSIONS.WORKFLOWS.EXECUTE,
      PERMISSIONS.AGENTS.READ,
      PERMISSIONS.PROMPTS.READ,
      PERMISSIONS.TOOLS.READ,
      PERMISSIONS.EXECUTIONS.CREATE,
      PERMISSIONS.EXECUTIONS.READ,
      PERMISSIONS.EXECUTIONS.CANCEL,
      PERMISSIONS.EXECUTIONS.RETRY,
    ],
  },
  {
    code: ROLES.VIEWER,
    name: 'Viewer',
    description: 'Read-only access',
    permissions: [
      PERMISSIONS.WORKFLOWS.READ,
      PERMISSIONS.AGENTS.READ,
      PERMISSIONS.PROMPTS.READ,
      PERMISSIONS.TOOLS.READ,
      PERMISSIONS.EXECUTIONS.READ,
    ],
  },
];

async function seed(): Promise<void> {
  await AppDataSource.initialize();

  const permissionRepo = AppDataSource.getRepository(PermissionEntity);
  const roleRepo = AppDataSource.getRepository(RoleEntity);
  const userRepo = AppDataSource.getRepository(UserEntity);

  for (const code of ALL_PERMISSIONS) {
    const [resource, action] = code.split(':');
    const existing = await permissionRepo.findOne({ where: { code } });
    if (existing) {
      existing.name = code;
      existing.resource = resource;
      existing.action = action;
      await permissionRepo.save(existing);
    } else {
      await permissionRepo.save(
        permissionRepo.create({
          code,
          name: code,
          resource,
          action,
        }),
      );
    }
  }

  const allPermissions = await permissionRepo.find();
  const permissionByCode = new Map(allPermissions.map((p) => [p.code, p]));

  for (const definition of ROLE_DEFINITIONS) {
    let role = await roleRepo.findOne({
      where: { code: definition.code },
      relations: ['permissions'],
    });

    if (!role) {
      role = roleRepo.create({
        code: definition.code,
        name: definition.name,
        description: definition.description,
      });
    } else {
      role.name = definition.name;
      role.description = definition.description;
    }

    role.permissions = definition.permissions
      .map((code) => permissionByCode.get(code))
      .filter((p): p is PermissionEntity => Boolean(p));

    await roleRepo.save(role);
  }

  const bootstrapEmail = (process.env.BOOTSTRAP_ADMIN_EMAIL ?? '').trim().toLowerCase();
  const bootstrapPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? '';

  if (bootstrapEmail && bootstrapPassword) {
    const superAdminRole = await roleRepo.findOne({
      where: { code: ROLES.SUPER_ADMIN },
      relations: ['permissions'],
    });

    if (!superAdminRole) {
      throw new Error('super_admin role missing after seed');
    }

    let admin = await userRepo.findOne({
      where: { email: bootstrapEmail },
      relations: ['roles'],
    });

    if (!admin) {
      admin = userRepo.create({
        email: bootstrapEmail,
        firstName: 'Bootstrap',
        lastName: 'Admin',
        passwordHash: await hashPassword(bootstrapPassword),
        status: UserStatus.ACTIVE,
        roles: [superAdminRole],
        lastLoginAt: null,
      });
    } else {
      admin.status = UserStatus.ACTIVE;
      admin.roles = [superAdminRole];
      if (process.env.BOOTSTRAP_ADMIN_RESET_PASSWORD === 'true') {
        admin.passwordHash = await hashPassword(bootstrapPassword);
      }
    }

    await userRepo.save(admin);
    console.log(`Bootstrap super_admin ready: ${bootstrapEmail}`);
  } else {
    console.warn('BOOTSTRAP_ADMIN_EMAIL/PASSWORD not set — skipped bootstrap user');
  }

  console.log('RBAC seed completed');
  await AppDataSource.destroy();
}

seed().catch(async (error: unknown) => {
  console.error('RBAC seed failed', error);
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(1);
});
