import { registerAs } from '@nestjs/config';

import { JwtConfig } from './config.type';

export default registerAs('jwt', (): JwtConfig => ({
  secret: process.env.JWT_SECRET ?? '',
  accessExpiration: process.env.JWT_ACCESS_EXPIRATION ?? '15m',
  refreshExpiration: process.env.JWT_REFRESH_EXPIRATION ?? '7d',
  refreshCookieName: process.env.AUTH_REFRESH_COOKIE_NAME ?? 'refresh_token',
  refreshCookieSecure: process.env.AUTH_REFRESH_COOKIE_SECURE === 'true',
  refreshCookieSameSite:
    (process.env.AUTH_REFRESH_COOKIE_SAME_SITE as 'lax' | 'strict' | 'none') ?? 'lax',
  lockoutMaxAttempts: parseInt(process.env.AUTH_LOCKOUT_MAX_ATTEMPTS ?? '5', 10),
  lockoutWindowSeconds: parseInt(process.env.AUTH_LOCKOUT_WINDOW_SECONDS ?? '900', 10),
  bootstrapAdminEmail: process.env.BOOTSTRAP_ADMIN_EMAIL ?? '',
  bootstrapAdminPassword: process.env.BOOTSTRAP_ADMIN_PASSWORD ?? '',
}));
