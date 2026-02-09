import { MigrationInterface, QueryRunner } from 'typeorm';

export class RepairProjectGeneralInfoColumns1739010000000 implements MigrationInterface {
  name = 'RepairProjectGeneralInfoColumns1739010000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "projects"
      ADD COLUMN IF NOT EXISTS "client_company" varchar(180)
    `);
    await queryRunner.query(`
      ALTER TABLE "projects"
      ADD COLUMN IF NOT EXISTS "client_email" varchar(255)
    `);
    await queryRunner.query(`
      ALTER TABLE "projects"
      ADD COLUMN IF NOT EXISTS "client_website" varchar(255)
    `);
    await queryRunner.query(`
      ALTER TABLE "projects"
      ADD COLUMN IF NOT EXISTS "milestone_template" varchar(40)
    `);
    await queryRunner.query(`
      UPDATE "projects"
      SET "milestone_template" = 'STANDARD'
      WHERE "milestone_template" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "projects"
      ALTER COLUMN "milestone_template" SET DEFAULT 'STANDARD'
    `);
    await queryRunner.query(`
      ALTER TABLE "projects"
      ALTER COLUMN "milestone_template" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "projects" DROP COLUMN IF EXISTS "milestone_template"
    `);
    await queryRunner.query(`
      ALTER TABLE "projects" DROP COLUMN IF EXISTS "client_website"
    `);
    await queryRunner.query(`
      ALTER TABLE "projects" DROP COLUMN IF EXISTS "client_email"
    `);
    await queryRunner.query(`
      ALTER TABLE "projects" DROP COLUMN IF EXISTS "client_company"
    `);
  }
}
