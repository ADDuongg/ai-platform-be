import { HttpStatus, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { DEFAULT_ROLE, ERROR_CODES, ROLES } from '@common/constants';
import { UserStatus } from '@common/enums';
import { AppException } from '@common/exceptions';
import { hashPassword } from '@common/utils';
import { AuthAction } from '@modules/auth/entities/auth-audit-log.entity';
import { AuthAuditLogsRepository } from '@modules/auth/repositories/auth-audit-logs.repository';
import { RolesService } from '@modules/auth/services/roles.service';

import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { UserEntity } from '../entities/user.entity';
import { UsersRepository } from '../repositories/users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly rolesService: RolesService,
    private readonly authAuditLogsRepository: AuthAuditLogsRepository,
  ) {}

  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.requireUser(id);
    return this.toDto(user);
  }

  async findByEmail(email: string): Promise<UserResponseDto | null> {
    const user = await this.usersRepository.findByEmail(email);
    return user ? this.toDto(user) : null;
  }

  async list(
    page = 1,
    limit = 20,
  ): Promise<{ data: UserResponseDto[]; meta: Record<string, number> }> {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const [users, total] = await this.usersRepository.findManyPaginated(safePage, safeLimit);
    return {
      data: users.map((user) => this.toDto(user)),
      meta: { page: safePage, limit: safeLimit, total },
    };
  }

  async create(dto: CreateUserDto, actorRoles: string[]): Promise<UserResponseDto> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.usersRepository.findByEmail(email);
    if (existing) {
      throw new AppException('User already exists', HttpStatus.CONFLICT, {
        code: ERROR_CODES.USER_ALREADY_EXISTS,
      });
    }

    const roleCodes =
      dto.roleCodes && dto.roleCodes.length > 0 ? [...new Set(dto.roleCodes)] : [DEFAULT_ROLE];

    this.assertCanAssignRoles(actorRoles, roleCodes);

    const roles = await this.rolesService.resolveRolesByCodes(roleCodes);
    const user = await this.usersRepository.createAndSave({
      email,
      firstName: dto.firstName?.trim() || 'User',
      lastName: dto.lastName?.trim() || 'Account',
      passwordHash: await hashPassword(dto.password),
      status: dto.status ?? UserStatus.ACTIVE,
      roles,
      lastLoginAt: null,
    });

    const created = await this.requireUser(user.id);
    return this.toDto(created);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.requireUser(id);

    if (dto.firstName !== undefined) {
      user.firstName = dto.firstName;
    }
    if (dto.lastName !== undefined) {
      user.lastName = dto.lastName;
    }
    if (dto.status !== undefined) {
      user.status = dto.status;
    }

    await this.usersRepository.save(user);
    return this.toDto(user);
  }

  async softDelete(id: string): Promise<{ message: string }> {
    const user = await this.requireUser(id);

    if (user.roles.some((role) => role.code === ROLES.SUPER_ADMIN)) {
      await this.assertCanDemoteSuperAdmin(user.id);
    }

    await this.usersRepository.softDelete(id);
    return { message: 'User deleted' };
  }

  async updateRoles(
    id: string,
    roleCodes: string[],
    actor: { sub: string; roles: string[] },
    meta: { ip?: string | null; userAgent?: string | null } = {},
  ): Promise<UserResponseDto> {
    const user = await this.requireUser(id);

    const uniqueCodes = [...new Set(roleCodes)];
    this.assertCanAssignRoles(actor.roles, uniqueCodes);

    const currentlySuperAdmin = user.roles.some((role) => role.code === ROLES.SUPER_ADMIN);
    const willBeSuperAdmin = uniqueCodes.includes(ROLES.SUPER_ADMIN);
    if (currentlySuperAdmin && !willBeSuperAdmin) {
      await this.assertCanDemoteSuperAdmin(user.id);
    }

    user.roles = await this.rolesService.resolveRolesByCodes(uniqueCodes);
    await this.usersRepository.save(user);

    await this.authAuditLogsRepository.log({
      userId: actor.sub,
      action: AuthAction.ROLE_CHANGE,
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata: { targetUserId: id, roleCodes: uniqueCodes },
    });

    return this.toDto(user);
  }

  private async requireUser(id: string): Promise<UserEntity> {
    const user = await this.usersRepository.findByIdWithRoles(id);
    if (!user) {
      throw new AppException('User not found', HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.USER_NOT_FOUND,
      });
    }
    return user;
  }

  private async assertCanDemoteSuperAdmin(userId: string): Promise<void> {
    const remaining = await this.usersRepository.countActiveSuperAdmins(userId);
    if (remaining < 1) {
      throw new AppException(
        'Cannot remove the last active super_admin',
        HttpStatus.BAD_REQUEST,
        { code: ERROR_CODES.CANNOT_REMOVE_LAST_SUPER_ADMIN },
      );
    }
  }

  private assertCanAssignRoles(actorRoles: string[], roleCodes: string[]): void {
    if (roleCodes.includes(ROLES.SUPER_ADMIN) && !actorRoles.includes(ROLES.SUPER_ADMIN)) {
      throw new AppException('Cannot assign super_admin role', HttpStatus.FORBIDDEN, {
        code: ERROR_CODES.CANNOT_ASSIGN_SUPER_ADMIN,
      });
    }
  }

  private toDto(user: UserEntity): UserResponseDto {
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }
}
