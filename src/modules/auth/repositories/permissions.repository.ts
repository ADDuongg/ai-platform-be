import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { PermissionEntity } from '../entities/permission.entity';

@Injectable()
export class PermissionsRepository {
  constructor(
    @InjectRepository(PermissionEntity)
    private readonly repository: Repository<PermissionEntity>,
  ) {}

  async findAll(): Promise<PermissionEntity[]> {
    return this.repository.find({ order: { resource: 'ASC', action: 'ASC' } });
  }

  async findByCodes(codes: string[]): Promise<PermissionEntity[]> {
    return this.repository.find({ where: { code: In(codes) } });
  }

  async findByCode(code: string): Promise<PermissionEntity | null> {
    return this.repository.findOne({ where: { code } });
  }
}
