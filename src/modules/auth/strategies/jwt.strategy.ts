import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AllConfigType } from '@common/config';
import { JwtPayload } from '@common/decorators';
import { UnauthorizedException } from '@common/exceptions';
import { ERROR_CODES } from '@common/constants';
import { RedisService } from '@infrastructure/redis';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService<AllConfigType>,
    private readonly redisService: RedisService,
  ) {
    const jwt = configService.get('jwt', { infer: true });

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwt?.secret ?? '',
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid token', ERROR_CODES.INVALID_TOKEN);
    }

    if (payload.jti) {
      const isBlacklisted = await this.redisService.get(`token:blacklist:${payload.jti}`);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked', ERROR_CODES.INVALID_TOKEN);
      }
    }

    return {
      sub: payload.sub,
      email: payload.email,
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
      jti: payload.jti,
    };
  }
}
