import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { RefreshTokenEntity } from '../entities/refresh-token.entity';

@Injectable()
export class RefreshTokensRepository {
  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly repository: Repository<RefreshTokenEntity>,
  ) {}

  async findByTokenHash(tokenHash: string): Promise<RefreshTokenEntity | null> {
    return this.repository.findOne({ where: { tokenHash } });
  }

  async findActiveByTokenHash(tokenHash: string): Promise<RefreshTokenEntity | null> {
    return this.repository.findOne({
      where: { tokenHash, revokedAt: IsNull() },
    });
  }

  async findActiveByFamily(familyId: string): Promise<RefreshTokenEntity[]> {
    return this.repository.find({
      where: { familyId, revokedAt: IsNull() },
    });
  }

  async create(data: Partial<RefreshTokenEntity>): Promise<RefreshTokenEntity> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async revokeByFamily(familyId: string): Promise<void> {
    await this.repository.update({ familyId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  async revokeAllByUser(userId: string): Promise<void> {
    await this.repository.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  async revokeById(id: string, replacedById?: string): Promise<void> {
    await this.repository.update(id, {
      revokedAt: new Date(),
      replacedById: replacedById ?? null,
    });
  }
}
