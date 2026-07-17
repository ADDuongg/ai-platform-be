import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
  jti: string;
  iat?: number;
  exp?: number;
}

/**
 * Extracts the authenticated user from the request.
 * Use after JwtAuthGuard has validated the token.
 */
export const CurrentUser = createParamDecorator(
  (
    data: keyof JwtPayload | undefined,
    ctx: ExecutionContext,
  ): JwtPayload | string | string[] | number | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
    const user = request.user;

    if (data) {
      return user?.[data];
    }

    return user;
  },
);
