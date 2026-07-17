import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthRbacTables1710000001000 implements MigrationInterface {
  name = 'CreateAuthRbacTables1710000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "permissions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying(100) NOT NULL,
        "name" character varying(100) NOT NULL,
        "resource" character varying(50) NOT NULL,
        "action" character varying(50) NOT NULL,
        CONSTRAINT "PK_permissions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_permissions_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying(50) NOT NULL,
        "name" character varying(100) NOT NULL,
        "description" character varying(255),
        CONSTRAINT "PK_roles_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_roles_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "role_permissions" (
        "role_id" uuid NOT NULL,
        "permission_id" uuid NOT NULL,
        CONSTRAINT "PK_role_permissions" PRIMARY KEY ("role_id", "permission_id"),
        CONSTRAINT "FK_role_permissions_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_role_permissions_permission" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_roles" (
        "user_id" uuid NOT NULL,
        "role_id" uuid NOT NULL,
        CONSTRAINT "PK_user_roles" PRIMARY KEY ("user_id", "role_id"),
        CONSTRAINT "FK_user_roles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_roles_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "token_hash" character varying(64) NOT NULL,
        "user_id" uuid NOT NULL,
        "family_id" uuid NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "revoked_at" TIMESTAMPTZ,
        "replaced_by_id" uuid,
        "user_agent" character varying(512),
        "ip" character varying(45),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_refresh_tokens_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_user_id" ON "refresh_tokens" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_family_id" ON "refresh_tokens" ("family_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "auth_audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid,
        "action" character varying(50) NOT NULL,
        "ip" character varying(45),
        "user_agent" character varying(512),
        "metadata" jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_auth_audit_logs_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "token_hash" character varying(64) NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "used_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_password_reset_tokens_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_password_reset_tokens_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "FK_password_reset_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    const hasRolesColumn = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'roles'
    `);
    if (Array.isArray(hasRolesColumn) && hasRolesColumn.length > 0) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "roles"`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "password_reset_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_audit_logs"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_tokens_family_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_tokens_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "permissions"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "roles" text NOT NULL DEFAULT 'user'`,
    );
  }
}
