import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { PasswordResetTokenEntity } from '../entities/password-reset-token.entity';

@Injectable()
export class PasswordResetTokensRepository {
  constructor(
    @InjectRepository(PasswordResetTokenEntity)
    private readonly repository: Repository<PasswordResetTokenEntity>,
  ) {}

  async create(data: Partial<PasswordResetTokenEntity>): Promise<PasswordResetTokenEntity> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async findActiveByTokenHash(tokenHash: string): Promise<PasswordResetTokenEntity | null> {
    return this.repository.findOne({
      where: { tokenHash, usedAt: IsNull() },
    });
  }

  async markUsed(id: string): Promise<void> {
    await this.repository.update(id, { usedAt: new Date() });
  }

  async invalidateAllForUser(userId: string): Promise<void> {
    await this.repository.update({ userId, usedAt: IsNull() }, { usedAt: new Date() });
  }
}
