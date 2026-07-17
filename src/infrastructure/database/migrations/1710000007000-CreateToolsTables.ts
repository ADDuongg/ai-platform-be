import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateToolsTables1710000007000 implements MigrationInterface {
  name = 'CreateToolsTables1710000007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tools" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" varchar(64) NOT NULL,
        "name" varchar(120) NOT NULL,
        "description" text,
        "tool_type" varchar(32) NOT NULL,
        "status" varchar(32) NOT NULL DEFAULT 'draft',
        "enabled" boolean NOT NULL DEFAULT true,
        "current_version" int,
        "created_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "PK_tools" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_tools_code_active" ON "tools" ("code") WHERE "deleted_at" IS NULL`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_tools_status_tool_type" ON "tools" ("status", "tool_type")`,
    );

    await queryRunner.query(`CREATE INDEX "IDX_tools_deleted_at" ON "tools" ("deleted_at")`);

    await queryRunner.query(`
      CREATE TABLE "tool_versions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tool_id" uuid NOT NULL,
        "version" int NOT NULL,
        "status" varchar(32) NOT NULL DEFAULT 'draft',
        "config_json" jsonb NOT NULL DEFAULT '{}',
        "input_schema" jsonb NOT NULL DEFAULT '{}',
        "output_schema" jsonb NOT NULL DEFAULT '{}',
        "secret_ref" varchar(255),
        "timeout_ms" int,
        "max_retries" int,
        "changelog" text,
        "published_at" timestamptz,
        "created_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "PK_tool_versions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tool_versions_tool" FOREIGN KEY ("tool_id")
          REFERENCES "tools"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_tool_versions_tool_id_version" ON "tool_versions" ("tool_id", "version")`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_tool_versions_one_draft" ON "tool_versions" ("tool_id") WHERE "status" = 'draft'`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_tool_versions_tool_id" ON "tool_versions" ("tool_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tool_versions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tools"`);
  }
}
