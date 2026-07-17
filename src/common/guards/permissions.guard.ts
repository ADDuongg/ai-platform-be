import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY, PERMISSIONS_KEY } from '../constants';
import { Permission } from '../constants/permissions';
import { ForbiddenException } from '../exceptions';

interface RequestUser {
  permissions?: string[];
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = request.user;

    if (!user?.permissions?.length) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const permissions = user.permissions ?? [];
    const hasPermission = requiredPermissions.some((perm) => permissions.includes(perm));

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions', {
        required: requiredPermissions,
      });
    }

    return true;
  }
}
