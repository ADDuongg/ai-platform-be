import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AllConfigType } from '@common/config';
import { UsersModule } from '@modules/users/users.module';

import { AuthController } from './controllers/auth.controller';
import { RolesController } from './controllers/roles.controller';
import {
  AuthAuditLogEntity,
  PasswordResetTokenEntity,
  PermissionEntity,
  RefreshTokenEntity,
  RoleEntity,
} from './entities';
import {
  AuthAuditLogsRepository,
  PasswordResetTokensRepository,
  PermissionsRepository,
  RefreshTokensRepository,
  RolesRepository,
} from './repositories';
import { AuthService } from './services/auth.service';
import { RolesService } from './services/roles.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfigType>) => {
        const jwt = configService.get('jwt', { infer: true });
        return {
          secret: jwt?.secret,
          signOptions: {
            expiresIn: (jwt?.accessExpiration ?? '15m') as `${number}m`,
          },
        };
      },
    }),
    TypeOrmModule.forFeature([
      RoleEntity,
      PermissionEntity,
      RefreshTokenEntity,
      AuthAuditLogEntity,
      PasswordResetTokenEntity,
    ]),
    forwardRef(() => UsersModule),
  ],
  controllers: [AuthController, RolesController],
  providers: [
    AuthService,
    RolesService,
    JwtStrategy,
    RefreshTokensRepository,
    AuthAuditLogsRepository,
    PasswordResetTokensRepository,
    RolesRepository,
    PermissionsRepository,
  ],
  exports: [
    AuthService,
    RolesService,
    RolesRepository,
    PermissionsRepository,
    AuthAuditLogsRepository,
    JwtModule,
    PassportModule,
  ],
})
export class AuthModule {}
