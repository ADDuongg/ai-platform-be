import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExecutionsTables1710000005000 implements MigrationInterface {
  name = 'CreateExecutionsTables1710000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "executions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workflow_id" uuid NOT NULL,
        "workflow_code" character varying(64) NOT NULL,
        "workflow_version" integer NOT NULL,
        "status" character varying(32) NOT NULL DEFAULT 'pending',
        "input_json" jsonb NOT NULL DEFAULT '{}',
        "context_json" jsonb NOT NULL DEFAULT '{}',
        "definition_snapshot" jsonb NOT NULL,
        "error_json" jsonb,
        "started_by" uuid,
        "started_at" TIMESTAMPTZ,
        "completed_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_executions_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_executions_workflow_id" ON "executions" ("workflow_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_executions_status" ON "executions" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_executions_started_by" ON "executions" ("started_by")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_executions_workflow_id_created_at" ON "executions" ("workflow_id", "created_at" DESC)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "execution_steps" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "execution_id" uuid NOT NULL,
        "node_id" character varying(64) NOT NULL,
        "agent_code" character varying(64) NOT NULL,
        "agent_version" integer NOT NULL,
        "status" character varying(32) NOT NULL DEFAULT 'pending',
        "attempt" integer NOT NULL DEFAULT 0,
        "max_retries" integer NOT NULL DEFAULT 0,
        "input_json" jsonb,
        "output_json" jsonb,
        "error_json" jsonb,
        "started_at" TIMESTAMPTZ,
        "completed_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_execution_steps_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_execution_steps_execution_id_node_id" UNIQUE ("execution_id", "node_id"),
        CONSTRAINT "FK_execution_steps_execution" FOREIGN KEY ("execution_id") REFERENCES "executions"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_execution_steps_execution_id" ON "execution_steps" ("execution_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_execution_steps_execution_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "execution_steps"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_executions_workflow_id_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_executions_started_by"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_executions_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_executions_workflow_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "executions"`);
  }
}
