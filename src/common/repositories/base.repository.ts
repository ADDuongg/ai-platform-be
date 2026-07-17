/**
 * Abstract base repository implementing common Data Mapper operations.
 * Feature repositories extend this class — never use Active Record.
 */
import { DeepPartial, EntityManager, FindOptionsWhere, ObjectLiteral, Repository } from 'typeorm';

import { IBaseRepository } from '../interfaces';

export abstract class BaseRepository<T extends ObjectLiteral> implements IBaseRepository<T> {
  constructor(protected readonly repository: Repository<T>) {}

  async findById(id: string): Promise<T | null> {
    return this.repository.findOne({
      where: { id } as unknown as FindOptionsWhere<T>,
    });
  }

  async findOneBy(where: FindOptionsWhere<T>): Promise<T | null> {
    return this.repository.findOne({ where });
  }

  async findMany(where?: FindOptionsWhere<T>): Promise<T[]> {
    return this.repository.find(where ? { where } : undefined);
  }

  async save(entity: T): Promise<T> {
    return this.repository.save(entity);
  }

  async createAndSave(data: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  async withTransaction<R>(work: (manager: EntityManager) => Promise<R>): Promise<R> {
    return this.repository.manager.transaction(work);
  }

  protected getRepo(manager?: EntityManager): Repository<T> {
    if (!manager) {
      return this.repository;
    }
    return manager.getRepository(this.repository.target);
  }
}
