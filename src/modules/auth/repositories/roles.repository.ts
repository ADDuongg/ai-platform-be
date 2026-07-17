import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { RoleEntity } from '../entities/role.entity';

@Injectable()
export class RolesRepository {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly repository: Repository<RoleEntity>,
  ) {}

  async findAll(): Promise<RoleEntity[]> {
    return this.repository.find({ relations: ['permissions'] });
  }

  async findByCode(code: string): Promise<RoleEntity | null> {
    return this.repository.findOne({
      where: { code },
      relations: ['permissions'],
    });
  }

  async findByCodes(codes: string[]): Promise<RoleEntity[]> {
    return this.repository.find({
      where: { code: In(codes) },
      relations: ['permissions'],
    });
  }

  async findById(id: string): Promise<RoleEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['permissions'],
    });
  }

  async save(role: RoleEntity): Promise<RoleEntity> {
    return this.repository.save(role);
  }
}
