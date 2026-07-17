import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Allow reusing workflow codes after soft-delete (archive).
 * Active rows (deleted_at IS NULL) remain uniquely constrained on code.
 */
export class WorkflowCodeUniqueActiveOnly1710000004000 implements MigrationInterface {
  name = 'WorkflowCodeUniqueActiveOnly1710000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workflows" DROP CONSTRAINT IF EXISTS "UQ_workflows_code"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_workflows_code"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_workflows_code"`);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_workflows_code_active" ON "workflows" ("code") WHERE "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_workflows_code_active"`);
    await queryRunner.query(
      `ALTER TABLE "workflows" ADD CONSTRAINT "UQ_workflows_code" UNIQUE ("code")`,
    );
  }
}
