import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExecutionArtifactsTable1710000009000 implements MigrationInterface {
  name = 'CreateExecutionArtifactsTable1710000009000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "execution_artifacts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "execution_id" uuid NOT NULL,
        "key" character varying(128) NOT NULL,
        "kind" character varying(32) NOT NULL,
        "label" character varying(256),
        "persist" character varying(16) NOT NULL,
        "status" character varying(16) NOT NULL DEFAULT 'ready',
        "content_json" jsonb,
        "storage_key" character varying(512),
        "content_type" character varying(128),
        "byte_size" integer,
        "source_node_id" character varying(64),
        "error_message" text,
        "error_json" jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_execution_artifacts_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_execution_artifacts_execution_id_key" UNIQUE ("execution_id", "key"),
        CONSTRAINT "FK_execution_artifacts_execution" FOREIGN KEY ("execution_id")
          REFERENCES "executions"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_execution_artifacts_execution_id" ON "execution_artifacts" ("execution_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_execution_artifacts_execution_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "execution_artifacts"`);
  }
}
