import { SetMetadata } from '@nestjs/common';

import { PERMISSIONS_KEY } from '../constants';
import { Permission } from '../constants/permissions';

/**
 * Restricts access to users possessing ANY of the specified permissions.
 */
export const Permissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
