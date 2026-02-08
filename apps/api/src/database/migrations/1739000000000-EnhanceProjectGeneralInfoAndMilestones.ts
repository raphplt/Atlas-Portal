import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnhanceProjectGeneralInfoAndMilestones1739000000000 implements MigrationInterface {
  name = 'EnhanceProjectGeneralInfoAndMilestones1739000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "projects"
      ADD COLUMN "client_company" varchar(180)
    `);
    await queryRunner.query(`
      ALTER TABLE "projects"
      ADD COLUMN "client_email" varchar(255)
    `);
    await queryRunner.query(`
      ALTER TABLE "projects"
      ADD COLUMN "client_website" varchar(255)
    `);
    await queryRunner.query(`
      ALTER TABLE "projects"
      ADD COLUMN "milestone_template" varchar(40) NOT NULL DEFAULT 'STANDARD'
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
