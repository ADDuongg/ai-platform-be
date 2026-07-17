import { Body, Controller, Get, Patch, Post, Req, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';

import { AllConfigType } from '@common/config';
import { CurrentUser, JwtPayload, Public } from '@common/decorators';

import {
  AuthTokenResponseDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  MeResponseDto,
  ResetPasswordDto,
} from '../dto';
import { AuthService } from '../services/auth.service';

class LoginResponseDto extends AuthTokenResponseDto {
  user!: MeResponseDto;
}

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiOkResponse({ type: LoginResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    return this.authService.login(dto.email, dto.password, res, this.meta(req));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Rotate refresh cookie and issue access token' })
  @ApiOkResponse({ type: LoginResponseDto })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    return this.authService.refresh(this.readRefreshCookie(req), res, this.meta(req));
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Revoke current session' })
  async logout(
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    return this.authService.logout(
      user.sub,
      user.jti,
      this.readRefreshCookie(req),
      res,
      this.meta(req),
    );
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Revoke all sessions' })
  async logoutAll(
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    return this.authService.logoutAll(user.sub, user.jti, res, this.meta(req));
  }

  @Get('me')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Current authenticated user' })
  @ApiOkResponse({ type: MeResponseDto })
  async me(@CurrentUser('sub') userId: string): Promise<MeResponseDto> {
    return this.authService.me(userId);
  }

  @Patch('password')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Change password' })
  async changePassword(
    @CurrentUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    return this.authService.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
      this.meta(req),
    );
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Request password reset (stub mailer)' })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto.email, this.meta(req));
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(dto.token, dto.newPassword, this.meta(req));
  }

  private readRefreshCookie(req: Request): string | undefined {
    const jwt = this.configService.get('jwt', { infer: true });
    const name = jwt?.refreshCookieName ?? 'refresh_token';
    const cookies = req.cookies as Record<string, string> | undefined;
    return cookies?.[name];
  }

  private meta(req: Request): { ip?: string | null; userAgent?: string | null } {
    return {
      ip: req.ip ?? req.socket.remoteAddress ?? null,
      userAgent: req.get('user-agent') ?? null,
    };
  }
}
