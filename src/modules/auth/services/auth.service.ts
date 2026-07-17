import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { CookieOptions, Response } from 'express';

import { AllConfigType, JwtConfig } from '@common/config';
import { JwtPayload } from '@common/decorators';
import { ERROR_CODES } from '@common/constants';
import { UserStatus } from '@common/enums';
import { UnauthorizedException } from '@common/exceptions';
import {
  hashPassword,
  hashToken,
  parseDurationToMs,
  parseDurationToSeconds,
  verifyPassword,
} from '@common/utils';
import { RedisService } from '@infrastructure/redis';
import { UserEntity } from '@modules/users/entities/user.entity';
import { UsersRepository } from '@modules/users/repositories/users.repository';

import { AuthTokenResponseDto, MeResponseDto } from '../dto/auth-response.dto';
import { AuthAction } from '../entities/auth-audit-log.entity';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import { AuthAuditLogsRepository } from '../repositories/auth-audit-logs.repository';
import { PasswordResetTokensRepository } from '../repositories/password-reset-tokens.repository';
import { RefreshTokensRepository } from '../repositories/refresh-tokens.repository';
import { getUserPermissionCodes, getUserRoleCodes } from '../utils/rbac.util';

export interface AuthRequestMeta {
  ip?: string | null;
  userAgent?: string | null;
}

const PASSWORD_RESET_TTL_SECONDS = 3600;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly refreshTokensRepository: RefreshTokensRepository,
    private readonly authAuditLogsRepository: AuthAuditLogsRepository,
    private readonly passwordResetTokensRepository: PasswordResetTokensRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly redisService: RedisService,
  ) {}

  async login(
    email: string,
    password: string,
    res: Response,
    meta: AuthRequestMeta = {},
  ): Promise<AuthTokenResponseDto & { user: MeResponseDto }> {
    const normalizedEmail = email.toLowerCase().trim();
    await this.assertNotLocked(normalizedEmail);

    const user = await this.usersRepository.findByEmailWithPassword(normalizedEmail);
    const passwordValid = user ? await verifyPassword(user.passwordHash, password) : false;

    if (!user || !passwordValid) {
      await this.registerFailedLogin(normalizedEmail, user?.id ?? null, meta);
      throw new UnauthorizedException('Invalid credentials', ERROR_CODES.INVALID_CREDENTIALS);
    }

    if (user.status !== UserStatus.ACTIVE || user.deletedAt) {
      await this.authAuditLogsRepository.log({
        userId: user.id,
        action: AuthAction.LOGIN_FAILED,
        ip: meta.ip,
        userAgent: meta.userAgent,
        metadata: { reason: 'inactive_status', status: user.status },
      });
      throw new UnauthorizedException('Account is not active', ERROR_CODES.ACCOUNT_INACTIVE);
    }

    await this.clearLockout(normalizedEmail);
    user.lastLoginAt = new Date();
    await this.usersRepository.save(user);

    const { tokens } = await this.issueSession(user, res, meta);
    await this.authAuditLogsRepository.log({
      userId: user.id,
      action: AuthAction.LOGIN_SUCCESS,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return { ...tokens, user: this.toMeResponse(user) };
  }

  async refresh(
    refreshToken: string | undefined,
    res: Response,
    meta: AuthRequestMeta = {},
  ): Promise<AuthTokenResponseDto & { user: MeResponseDto }> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing', ERROR_CODES.REFRESH_TOKEN_INVALID);
    }

    const existing = await this.validateRefreshToken(refreshToken, res, meta);
    const user = await this.validateActiveUser(existing.userId, existing.familyId, res);

    const { tokens, refreshTokenId } = await this.issueSession(user, res, meta, existing.familyId);
    await this.refreshTokensRepository.revokeById(existing.id, refreshTokenId);

    await this.authAuditLogsRepository.log({
      userId: user.id,
      action: AuthAction.TOKEN_REFRESH,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return { ...tokens, user: this.toMeResponse(user) };
  }

  async logout(
    userId: string,
    jti: string | undefined,
    refreshToken: string | undefined,
    res: Response,
    meta: AuthRequestMeta = {},
  ): Promise<{ message: string }> {
    if (refreshToken) {
      const existing = await this.refreshTokensRepository.findByTokenHash(hashToken(refreshToken));
      if (existing && existing.userId === userId && !existing.revokedAt) {
        await this.refreshTokensRepository.revokeById(existing.id);
      }
    }

    if (jti) {
      await this.blacklistAccessJti(jti);
    }

    this.clearRefreshCookie(res);
    await this.authAuditLogsRepository.log({
      userId,
      action: AuthAction.LOGOUT,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return { message: 'Logged out' };
  }

  async logoutAll(
    userId: string,
    jti: string | undefined,
    res: Response,
    meta: AuthRequestMeta = {},
  ): Promise<{ message: string }> {
    await this.refreshTokensRepository.revokeAllByUser(userId);
    if (jti) {
      await this.blacklistAccessJti(jti);
    }
    this.clearRefreshCookie(res);
    await this.authAuditLogsRepository.log({
      userId,
      action: AuthAction.LOGOUT_ALL,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return { message: 'All sessions revoked' };
  }

  async me(userId: string): Promise<MeResponseDto> {
    const user = await this.usersRepository.findByIdWithRoles(userId);
    if (!user) {
      throw new UnauthorizedException('User not found', ERROR_CODES.INVALID_TOKEN);
    }
    return this.toMeResponse(user);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    meta: AuthRequestMeta = {},
  ): Promise<{ message: string }> {
    const user = await this.usersRepository.findByIdWithPassword(userId);
    if (!user) {
      throw new UnauthorizedException('User not found', ERROR_CODES.INVALID_TOKEN);
    }

    const valid = await verifyPassword(user.passwordHash, currentPassword);
    if (!valid) {
      throw new UnauthorizedException(
        'Current password is incorrect',
        ERROR_CODES.PASSWORD_MISMATCH,
      );
    }

    user.passwordHash = await hashPassword(newPassword);
    await this.usersRepository.save(user);
    await this.passwordResetTokensRepository.invalidateAllForUser(userId);

    await this.authAuditLogsRepository.log({
      userId,
      action: AuthAction.PASSWORD_CHANGED,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return { message: 'Password changed' };
  }

  async forgotPassword(email: string, meta: AuthRequestMeta = {}): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.usersRepository.findByEmail(normalizedEmail);

    if (user && user.status === UserStatus.ACTIVE && !user.deletedAt) {
      const rawToken = randomUUID() + randomUUID();

      await this.passwordResetTokensRepository.invalidateAllForUser(user.id);
      await this.passwordResetTokensRepository.create({
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_SECONDS * 1000),
        usedAt: null,
      });

      // Stub mailer: log token only outside production
      if (
        (this.configService.get('app', { infer: true })?.nodeEnv ?? 'development') !== 'production'
      ) {
        this.logger.warn(`Password reset token for ${normalizedEmail}: ${rawToken}`);
      }

      await this.authAuditLogsRepository.log({
        userId: user.id,
        action: AuthAction.PASSWORD_RESET_REQUESTED,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    }

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(
    token: string,
    newPassword: string,
    meta: AuthRequestMeta = {},
  ): Promise<{ message: string }> {
    const entity = await this.passwordResetTokensRepository.findActiveByTokenHash(hashToken(token));
    if (!entity) {
      throw new UnauthorizedException(
        'Invalid reset token',
        ERROR_CODES.PASSWORD_RESET_TOKEN_INVALID,
      );
    }

    if (entity.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException(
        'Reset token expired',
        ERROR_CODES.PASSWORD_RESET_TOKEN_EXPIRED,
      );
    }

    const user = await this.usersRepository.findByIdWithPassword(entity.userId);
    if (!user || user.deletedAt) {
      throw new UnauthorizedException(
        'Invalid reset token',
        ERROR_CODES.PASSWORD_RESET_TOKEN_INVALID,
      );
    }

    user.passwordHash = await hashPassword(newPassword);
    await this.usersRepository.save(user);
    await this.passwordResetTokensRepository.markUsed(entity.id);
    await this.refreshTokensRepository.revokeAllByUser(user.id);

    await this.authAuditLogsRepository.log({
      userId: user.id,
      action: AuthAction.PASSWORD_RESET_COMPLETED,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return { message: 'Password reset successful' };
  }

  clearRefreshCookie(res: Response): void {
    const jwt = this.jwtSettings();
    res.clearCookie(jwt?.refreshCookieName ?? 'refresh_token', this.refreshCookieOptions());
  }

  private async validateRefreshToken(
    refreshToken: string,
    res: Response,
    meta: AuthRequestMeta,
  ): Promise<RefreshTokenEntity> {
    const existing = await this.refreshTokensRepository.findByTokenHash(hashToken(refreshToken));

    if (!existing) {
      throw new UnauthorizedException('Invalid refresh token', ERROR_CODES.REFRESH_TOKEN_INVALID);
    }

    if (existing.revokedAt) {
      await this.refreshTokensRepository.revokeByFamily(existing.familyId);
      await this.authAuditLogsRepository.log({
        userId: existing.userId,
        action: AuthAction.TOKEN_REUSE_DETECTED,
        ip: meta.ip,
        userAgent: meta.userAgent,
        metadata: { familyId: existing.familyId },
      });
      this.clearRefreshCookie(res);
      throw new UnauthorizedException(
        'Refresh token reuse detected',
        ERROR_CODES.REFRESH_TOKEN_REUSED,
      );
    }

    if (existing.expiresAt.getTime() <= Date.now()) {
      await this.refreshTokensRepository.revokeById(existing.id);
      this.clearRefreshCookie(res);
      throw new UnauthorizedException('Refresh token expired', ERROR_CODES.REFRESH_TOKEN_EXPIRED);
    }

    return existing;
  }

  private async validateActiveUser(
    userId: string,
    familyId: string,
    res: Response,
  ): Promise<UserEntity> {
    const user = await this.usersRepository.findByIdWithRoles(userId);
    if (!user || user.status !== UserStatus.ACTIVE || user.deletedAt) {
      await this.refreshTokensRepository.revokeByFamily(familyId);
      this.clearRefreshCookie(res);
      throw new UnauthorizedException('Account is not active', ERROR_CODES.ACCOUNT_INACTIVE);
    }
    return user;
  }

  private async issueSession(
    user: UserEntity,
    res: Response,
    meta: AuthRequestMeta,
    familyId: string = randomUUID(),
  ): Promise<{ tokens: AuthTokenResponseDto; refreshTokenId: string }> {
    const jwt = this.jwtSettings();
    const accessExpiration = jwt?.accessExpiration ?? '15m';
    const refreshExpiration = jwt?.refreshExpiration ?? '7d';
    const expiresIn = parseDurationToSeconds(accessExpiration);
    const jti = randomUUID();

    const roles = getUserRoleCodes(user);
    const permissions = getUserPermissionCodes(user);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles,
      permissions,
      jti,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: accessExpiration as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });

    const rawRefresh = randomUUID() + randomUUID();
    const refreshEntity = await this.refreshTokensRepository.create({
      userId: user.id,
      tokenHash: hashToken(rawRefresh),
      familyId,
      expiresAt: new Date(Date.now() + parseDurationToMs(refreshExpiration)),
      revokedAt: null,
      replacedById: null,
      userAgent: meta.userAgent ?? null,
      ip: meta.ip ?? null,
    });

    this.setRefreshCookie(res, rawRefresh, parseDurationToMs(refreshExpiration));

    return {
      tokens: { accessToken, tokenType: 'Bearer', expiresIn },
      refreshTokenId: refreshEntity.id,
    };
  }

  private setRefreshCookie(res: Response, token: string, maxAgeMs: number): void {
    const jwt = this.jwtSettings();
    res.cookie(jwt?.refreshCookieName ?? 'refresh_token', token, {
      ...this.refreshCookieOptions(),
      maxAge: maxAgeMs,
    });
  }

  private jwtSettings(): JwtConfig | undefined {
    return this.configService.get('jwt', { infer: true });
  }

  private refreshCookieOptions(): CookieOptions {
    const jwt = this.jwtSettings();
    return {
      httpOnly: true,
      secure: jwt?.refreshCookieSecure ?? false,
      sameSite: jwt?.refreshCookieSameSite ?? 'lax',
      path: '/api/v1/auth',
    };
  }

  private toMeResponse(user: UserEntity): MeResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      roles: getUserRoleCodes(user),
      permissions: getUserPermissionCodes(user),
      lastLoginAt: user.lastLoginAt,
    };
  }

  private lockoutKey(email: string): string {
    return `auth:lockout:${email}`;
  }

  private async assertNotLocked(email: string): Promise<void> {
    const jwt = this.jwtSettings();
    const maxAttempts = jwt?.lockoutMaxAttempts ?? 5;
    const current = await this.redisService.get(this.lockoutKey(email));
    if (current && Number.parseInt(current, 10) >= maxAttempts) {
      throw new UnauthorizedException('Account temporarily locked', ERROR_CODES.ACCOUNT_LOCKED);
    }
  }

  private async registerFailedLogin(
    email: string,
    userId: string | null,
    meta: AuthRequestMeta,
  ): Promise<void> {
    const jwt = this.jwtSettings();
    const maxAttempts = jwt?.lockoutMaxAttempts ?? 5;
    const windowSeconds = jwt?.lockoutWindowSeconds ?? 900;
    const key = this.lockoutKey(email);
    const attempts = await this.redisService.increment(key);
    if (attempts === 1) {
      await this.redisService.expire(key, windowSeconds);
    }

    await this.authAuditLogsRepository.log({
      userId,
      action: AuthAction.LOGIN_FAILED,
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata: { email, attempts },
    });

    if (attempts >= maxAttempts) {
      await this.authAuditLogsRepository.log({
        userId,
        action: AuthAction.ACCOUNT_LOCKED,
        ip: meta.ip,
        userAgent: meta.userAgent,
        metadata: { email, windowSeconds },
      });
    }
  }

  private async clearLockout(email: string): Promise<void> {
    await this.redisService.del(this.lockoutKey(email));
  }

  private async blacklistAccessJti(jti: string): Promise<void> {
    const jwt = this.jwtSettings();
    const ttl = parseDurationToSeconds(jwt?.accessExpiration ?? '15m');
    await this.redisService.set(`token:blacklist:${jti}`, '1', ttl);
  }
}
