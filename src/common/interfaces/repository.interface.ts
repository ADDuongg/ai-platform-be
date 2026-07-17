import { EntityManager, FindOptionsWhere, ObjectLiteral, Repository } from 'typeorm';

/**
 * Contract for domain repositories.
 * Prefer injecting this interface over TypeORM Repository directly in services.
 */
export interface IBaseRepository<T extends ObjectLiteral> {
  findById(id: string): Promise<T | null>;
  findOneBy(where: FindOptionsWhere<T>): Promise<T | null>;
  findMany(where?: FindOptionsWhere<T>): Promise<T[]>;
  save(entity: T): Promise<T>;
  softDelete(id: string): Promise<void>;
  withTransaction<R>(work: (manager: EntityManager) => Promise<R>): Promise<R>;
}

export type TypeOrmRepository<T extends ObjectLiteral> = Repository<T>;
