export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  DESIGNER: 'designer',
  OPERATOR: 'operator',
  VIEWER: 'viewer',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_HIERARCHY: Record<Role, number> = {
  [ROLES.SUPER_ADMIN]: 100,
  [ROLES.ADMIN]: 80,
  [ROLES.DESIGNER]: 60,
  [ROLES.OPERATOR]: 40,
  [ROLES.VIEWER]: 10,
};

export const DEFAULT_ROLE = ROLES.VIEWER;
