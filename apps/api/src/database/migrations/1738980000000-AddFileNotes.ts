import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFileNotes1738980000000 implements MigrationInterface {
  name = 'AddFileNotes1738980000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "file_notes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id" uuid NOT NULL,
        "file_id" uuid NOT NULL,
        "author_id" uuid NOT NULL,
        "content" text NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_file_notes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_file_notes_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_file_notes_file" FOREIGN KEY ("file_id") REFERENCES "file_assets"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_file_notes_author" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_file_notes_workspace_file_created" ON "file_notes" ("workspace_id", "file_id", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "file_notes"`);
  }
}
