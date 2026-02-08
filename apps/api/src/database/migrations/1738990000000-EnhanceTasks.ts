import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnhanceTasks1738990000000 implements MigrationInterface {
  name = 'EnhanceTasks1738990000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Create TaskPriority enum and add columns to tasks
    await queryRunner.query(`
      CREATE TYPE "task_priority_enum" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT')
    `);
    await queryRunner.query(`
      ALTER TABLE "tasks" ADD COLUMN "priority" "task_priority_enum"
    `);
    await queryRunner.query(`
      ALTER TABLE "tasks" ADD COLUMN "due_date" TIMESTAMP WITH TIME ZONE
    `);

    // 2) Add MILESTONE to task_source enum
    await queryRunner.query(`
      ALTER TYPE "task_source_enum" ADD VALUE IF NOT EXISTS 'MILESTONE'
    `);

    // 3) Add milestone_type column to tasks (reuses existing milestone_type_enum)
    await queryRunner.query(`
      ALTER TABLE "tasks" ADD COLUMN "milestone_type" "milestone_type_enum"
    `);

    // 4) Create task_checklist_items table
    await queryRunner.query(`
      CREATE TABLE "task_checklist_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id" uuid NOT NULL,
        "task_id" uuid NOT NULL,
        "title" varchar(255) NOT NULL,
        "completed" boolean NOT NULL DEFAULT false,
        "position" int NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_task_checklist_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_task_checklist_items_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_task_checklist_items_task" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_task_checklist_items_workspace_task_position"
        ON "task_checklist_items" ("workspace_id", "task_id", "position")
    `);

    // 5) Add task_id column to file_assets
    await queryRunner.query(`
      ALTER TABLE "file_assets" ADD COLUMN "task_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "file_assets"
        ADD CONSTRAINT "FK_file_assets_task"
        FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL
    `);

    // 6) Create milestone tasks for existing milestone_validations
    await queryRunner.query(`
      INSERT INTO "tasks" ("id", "workspace_id", "project_id", "source", "title", "status", "milestone_type", "position", "created_at", "updated_at")
      SELECT
        uuid_generate_v4(),
        mv."workspace_id",
        mv."project_id",
        'MILESTONE',
        CASE mv."type"
          WHEN 'DESIGN' THEN 'Design'
          WHEN 'CONTENT' THEN 'Content'
          WHEN 'DELIVERY' THEN 'Delivery'
        END,
        CASE WHEN mv."validated" THEN 'DONE' ELSE 'BACKLOG' END,
        mv."type",
        999,
        mv."created_at",
        mv."updated_at"
      FROM "milestone_validations" mv
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove milestone tasks
    await queryRunner.query(`
      DELETE FROM "tasks" WHERE "source" = 'MILESTONE'
    `);

    // Drop task_id FK and column from file_assets
    await queryRunner.query(`
      ALTER TABLE "file_assets" DROP CONSTRAINT IF EXISTS "FK_file_assets_task"
    `);
    await queryRunner.query(`
      ALTER TABLE "file_assets" DROP COLUMN IF EXISTS "task_id"
    `);

    // Drop task_checklist_items table
    await queryRunner.query(`DROP TABLE IF EXISTS "task_checklist_items"`);

    // Remove columns from tasks
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP COLUMN IF EXISTS "milestone_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP COLUMN IF EXISTS "due_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP COLUMN IF EXISTS "priority"`,
    );

    // Drop priority enum
    await queryRunner.query(`DROP TYPE IF EXISTS "task_priority_enum"`);
  }
}
