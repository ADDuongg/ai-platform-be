import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePromptsTables1710000006000 implements MigrationInterface {
  name = 'CreatePromptsTables1710000006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "prompts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" varchar(64) NOT NULL,
        "name" varchar(120) NOT NULL,
        "description" text,
        "category" varchar(64),
        "tags" jsonb NOT NULL DEFAULT '[]',
        "status" varchar(32) NOT NULL DEFAULT 'draft',
        "enabled" boolean NOT NULL DEFAULT true,
        "current_version" int,
        "created_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "PK_prompts" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_prompts_code_active" ON "prompts" ("code") WHERE "deleted_at" IS NULL`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_prompts_status_category" ON "prompts" ("status", "category")`,
    );

    await queryRunner.query(`CREATE INDEX "IDX_prompts_deleted_at" ON "prompts" ("deleted_at")`);

    await queryRunner.query(`
      CREATE TABLE "prompt_versions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "prompt_id" uuid NOT NULL,
        "version" int NOT NULL,
        "status" varchar(32) NOT NULL DEFAULT 'draft',
        "template" text,
        "messages" jsonb,
        "variables_schema" jsonb NOT NULL DEFAULT '{}',
        "model_hints" jsonb NOT NULL DEFAULT '{}',
        "changelog" text,
        "published_at" timestamptz,
        "created_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "PK_prompt_versions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_prompt_versions_prompt" FOREIGN KEY ("prompt_id")
          REFERENCES "prompts"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_prompt_versions_prompt_id_version" ON "prompt_versions" ("prompt_id", "version")`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_prompt_versions_one_draft" ON "prompt_versions" ("prompt_id") WHERE "status" = 'draft'`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_prompt_versions_prompt_id" ON "prompt_versions" ("prompt_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "prompt_versions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "prompts"`);
  }
}
