import { Column, Entity, Index, JoinTable, ManyToMany } from 'typeorm';

import { BaseEntity } from '@common/entities';
import { UserStatus } from '@common/enums';

import { RoleEntity } from '@modules/auth/entities/role.entity';

@Entity({ name: 'users' })
export class UserEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 100, name: 'first_name' })
  firstName!: string;

  @Column({ type: 'varchar', length: 100, name: 'last_name' })
  lastName!: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash', select: false })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 32, default: UserStatus.PENDING })
  status!: UserStatus;

  @ManyToMany(() => RoleEntity, { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles!: RoleEntity[];

  @Column({ type: 'timestamptz', name: 'last_login_at', nullable: true })
  lastLoginAt!: Date | null;
}
