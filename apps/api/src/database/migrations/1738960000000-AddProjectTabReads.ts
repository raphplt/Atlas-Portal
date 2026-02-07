import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectTabReads1738960000000 implements MigrationInterface {
  name = 'AddProjectTabReads1738960000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "project_tab_reads" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id" uuid NOT NULL,
        "project_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "tab_key" character varying(32) NOT NULL,
        "last_read_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_project_tab_reads_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_project_tab_reads_workspace_project_user" ON "project_tab_reads" ("workspace_id", "project_id", "user_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_project_tab_reads_unique_tab" ON "project_tab_reads" ("workspace_id", "project_id", "user_id", "tab_key")`,
    );

    await queryRunner.query(
      `ALTER TABLE "project_tab_reads" ADD CONSTRAINT "FK_project_tab_reads_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_tab_reads" ADD CONSTRAINT "FK_project_tab_reads_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_tab_reads" ADD CONSTRAINT "FK_project_tab_reads_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project_tab_reads" DROP CONSTRAINT "FK_project_tab_reads_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_tab_reads" DROP CONSTRAINT "FK_project_tab_reads_project"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_tab_reads" DROP CONSTRAINT "FK_project_tab_reads_workspace"`,
    );

    await queryRunner.query(
      `DROP INDEX "public"."IDX_project_tab_reads_unique_tab"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_project_tab_reads_workspace_project_user"`,
    );

    await queryRunner.query(`DROP TABLE "project_tab_reads"`);
  }
}
