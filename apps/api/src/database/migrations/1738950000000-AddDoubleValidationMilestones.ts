import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDoubleValidationMilestones1738950000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE milestone_validations
        ADD COLUMN IF NOT EXISTS validated_by_admin_id uuid,
        ADD COLUMN IF NOT EXISTS validated_by_admin_at timestamptz,
        ADD COLUMN IF NOT EXISTS admin_comment varchar(500),
        ADD COLUMN IF NOT EXISTS validated_by_client_id uuid,
        ADD COLUMN IF NOT EXISTS validated_by_client_at timestamptz,
        ADD COLUMN IF NOT EXISTS client_comment varchar(500);
    `);

    await queryRunner.query(`
      ALTER TABLE milestone_validations
        ADD CONSTRAINT fk_milestone_admin_user
          FOREIGN KEY (validated_by_admin_id) REFERENCES users(id) ON DELETE SET NULL,
        ADD CONSTRAINT fk_milestone_client_user
          FOREIGN KEY (validated_by_client_id) REFERENCES users(id) ON DELETE SET NULL;
    `);

    // Migrate existing single-validation data to admin validation
    await queryRunner.query(`
      UPDATE milestone_validations
        SET validated_by_admin_id = validated_by_id,
            validated_by_admin_at = validated_at,
            admin_comment = comment
        WHERE validated = true AND validated_by_id IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE milestone_validations
        DROP CONSTRAINT IF EXISTS fk_milestone_admin_user,
        DROP CONSTRAINT IF EXISTS fk_milestone_client_user;
    `);

    await queryRunner.query(`
      ALTER TABLE milestone_validations
        DROP COLUMN IF EXISTS validated_by_admin_id,
        DROP COLUMN IF EXISTS validated_by_admin_at,
        DROP COLUMN IF EXISTS admin_comment,
        DROP COLUMN IF EXISTS validated_by_client_id,
        DROP COLUMN IF EXISTS validated_by_client_at,
        DROP COLUMN IF EXISTS client_comment;
    `);
  }
}
