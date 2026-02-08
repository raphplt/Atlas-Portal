import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTicketStatusReason1738970000000 implements MigrationInterface {
  name = 'AddTicketStatusReason1738970000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "status_reason" character varying(1000)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tickets" DROP COLUMN IF EXISTS "status_reason"`,
    );
  }
}
