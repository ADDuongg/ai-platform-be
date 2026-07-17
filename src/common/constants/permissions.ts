export const PERMISSIONS = {
  USERS: {
    CREATE: 'users:create',
    READ: 'users:read',
    UPDATE: 'users:update',
    DELETE: 'users:delete',
  },
  ROLES: {
    MANAGE: 'roles:manage',
  },
  WORKFLOWS: {
    CREATE: 'workflows:create',
    READ: 'workflows:read',
    UPDATE: 'workflows:update',
    DELETE: 'workflows:delete',
    PUBLISH: 'workflows:publish',
    EXECUTE: 'workflows:execute',
  },
  AGENTS: {
    CREATE: 'agents:create',
    READ: 'agents:read',
    UPDATE: 'agents:update',
    DELETE: 'agents:delete',
    PUBLISH: 'agents:publish',
  },
  PROMPTS: {
    CREATE: 'prompts:create',
    READ: 'prompts:read',
    UPDATE: 'prompts:update',
    DELETE: 'prompts:delete',
    PUBLISH: 'prompts:publish',
  },
  TOOLS: {
    CREATE: 'tools:create',
    READ: 'tools:read',
    UPDATE: 'tools:update',
    DELETE: 'tools:delete',
    PUBLISH: 'tools:publish',
  },
  EXECUTIONS: {
    CREATE: 'executions:create',
    READ: 'executions:read',
    CANCEL: 'executions:cancel',
    RETRY: 'executions:retry',
  },
} as const;

type PermissionValues<T> =
  T extends Record<string, infer V>
    ? V extends string
      ? V
      : V extends Record<string, string>
        ? V[keyof V]
        : never
    : never;

export type Permission = PermissionValues<(typeof PERMISSIONS)[keyof typeof PERMISSIONS]>;

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS).flatMap((group) =>
  Object.values(group),
);
