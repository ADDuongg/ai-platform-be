import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ROLES } from '@common/constants';
import { UserStatus } from '@common/enums';
import { BaseRepository } from '@common/repositories';

import { UserEntity } from '../entities/user.entity';

@Injectable()
export class UsersRepository extends BaseRepository<UserEntity> {
  constructor(
    @InjectRepository(UserEntity)
    repository: Repository<UserEntity>,
  ) {
    super(repository);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.repository.findOne({
      where: { email: email.toLowerCase() },
      relations: { roles: { permissions: true } },
    });
  }

  async findByEmailWithPassword(email: string): Promise<UserEntity | null> {
    return this.repository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.roles', 'roles')
      .leftJoinAndSelect('roles.permissions', 'permissions')
      .where('user.email = :email', { email: email.toLowerCase() })
      .getOne();
  }

  async findByIdWithRoles(id: string): Promise<UserEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: { roles: { permissions: true } },
    });
  }

  async findByIdWithPassword(id: string): Promise<UserEntity | null> {
    return this.repository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.roles', 'roles')
      .leftJoinAndSelect('roles.permissions', 'permissions')
      .where('user.id = :id', { id })
      .getOne();
  }

  async findManyPaginated(page: number, limit: number): Promise<[UserEntity[], number]> {
    return this.repository.findAndCount({
      relations: { roles: { permissions: true } },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async countActiveSuperAdmins(excludeUserId?: string): Promise<number> {
    const qb = this.repository
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role')
      .where('role.code = :code', { code: ROLES.SUPER_ADMIN })
      .andWhere('user.status = :status', { status: UserStatus.ACTIVE });

    if (excludeUserId) {
      qb.andWhere('user.id != :excludeUserId', { excludeUserId });
    }

    return qb.getCount();
  }
}
