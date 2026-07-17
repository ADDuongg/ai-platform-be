import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'permissions' })
export class PermissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 50 })
  resource!: string;

  @Column({ type: 'varchar', length: 50 })
  action!: string;
}
