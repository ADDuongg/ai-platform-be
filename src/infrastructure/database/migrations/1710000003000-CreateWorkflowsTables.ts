import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorkflowsTables1710000003000 implements MigrationInterface {
  name = 'CreateWorkflowsTables1710000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workflows" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying(64) NOT NULL,
        "name" character varying(120) NOT NULL,
        "description" text,
        "category" character varying(64),
        "tags" jsonb NOT NULL DEFAULT '[]',
        "status" character varying(32) NOT NULL DEFAULT 'draft',
        "current_version" integer,
        "created_by" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_workflows_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_workflows_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_workflows_status" ON "workflows" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_workflows_category" ON "workflows" ("category")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_workflows_deleted_at" ON "workflows" ("deleted_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workflow_versions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workflow_id" uuid NOT NULL,
        "version" integer NOT NULL,
        "status" character varying(32) NOT NULL DEFAULT 'draft',
        "definition_json" jsonb NOT NULL,
        "changelog" text,
        "published_at" TIMESTAMPTZ,
        "created_by" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_workflow_versions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_workflow_versions_workflow_id_version" UNIQUE ("workflow_id", "version"),
        CONSTRAINT "FK_workflow_versions_workflow" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_workflow_versions_workflow_id" ON "workflow_versions" ("workflow_id")`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_workflow_versions_one_draft"
      ON "workflow_versions" ("workflow_id")
      WHERE "status" = 'draft'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_workflow_versions_one_draft"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_workflow_versions_workflow_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workflow_versions"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_workflows_deleted_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_workflows_category"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_workflows_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workflows"`);
  }
}
