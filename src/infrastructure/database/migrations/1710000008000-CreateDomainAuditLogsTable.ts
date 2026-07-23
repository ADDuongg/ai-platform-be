import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDomainAuditLogsTable1710000008000 implements MigrationInterface {
  name = 'CreateDomainAuditLogsTable1710000008000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "domain_audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "domain" varchar(32) NOT NULL,
        "action" varchar(50) NOT NULL,
        "resource_type" varchar(64) NOT NULL,
        "resource_id" uuid NOT NULL,
        "resource_code" varchar(128),
        "actor_user_id" uuid,
        "ip" varchar(45),
        "user_agent" varchar(512),
        "metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_domain_audit_logs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_domain_audit_logs_domain_created_at" ON "domain_audit_logs" ("domain", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_domain_audit_logs_resource" ON "domain_audit_logs" ("resource_type", "resource_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_domain_audit_logs_actor_created_at" ON "domain_audit_logs" ("actor_user_id", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_domain_audit_logs_action_created_at" ON "domain_audit_logs" ("action", "created_at" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_domain_audit_logs_action_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_domain_audit_logs_actor_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_domain_audit_logs_resource"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_domain_audit_logs_domain_created_at"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "domain_audit_logs"`);
  }
}
