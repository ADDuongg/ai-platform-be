import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAgentsTables1710000002000 implements MigrationInterface {
  name = 'CreateAgentsTables1710000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "agents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying(64) NOT NULL,
        "name" character varying(120) NOT NULL,
        "description" text,
        "capability_type" character varying(32) NOT NULL,
        "status" character varying(32) NOT NULL DEFAULT 'draft',
        "enabled" boolean NOT NULL DEFAULT true,
        "current_version" integer,
        "created_by" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_agents_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_agents_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_agents_status_capability_type" ON "agents" ("status", "capability_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_agents_deleted_at" ON "agents" ("deleted_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "agent_versions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "agent_id" uuid NOT NULL,
        "version" integer NOT NULL,
        "status" character varying(32) NOT NULL DEFAULT 'draft',
        "input_schema" jsonb NOT NULL,
        "output_schema" jsonb NOT NULL,
        "config_json" jsonb NOT NULL DEFAULT '{}',
        "timeout_ms" integer,
        "max_retries" integer,
        "prompt_ref" character varying(128),
        "tool_refs" jsonb NOT NULL DEFAULT '[]',
        "changelog" text,
        "published_at" TIMESTAMPTZ,
        "created_by" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_agent_versions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_agent_versions_agent_id_version" UNIQUE ("agent_id", "version"),
        CONSTRAINT "FK_agent_versions_agent" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_agent_versions_agent_id" ON "agent_versions" ("agent_id")`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_agent_versions_one_draft"
      ON "agent_versions" ("agent_id")
      WHERE "status" = 'draft'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_agent_versions_one_draft"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agent_versions_agent_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "agent_versions"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agents_deleted_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agents_status_capability_type"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "agents"`);
  }
}
