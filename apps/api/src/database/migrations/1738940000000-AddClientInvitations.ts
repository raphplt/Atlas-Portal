import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClientInvitations1738940000000 implements MigrationInterface {
  name = 'AddClientInvitations1738940000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "client_invitations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id" uuid NOT NULL,
        "invited_by_id" uuid NOT NULL,
        "accepted_user_id" uuid,
        "email" character varying(320) NOT NULL,
        "first_name" character varying(120),
        "last_name" character varying(120),
        "locale" character varying(2) NOT NULL DEFAULT 'fr',
        "token_hash" character varying(128) NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'PENDING',
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "accepted_at" TIMESTAMP WITH TIME ZONE,
        "revoked_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_client_invitations_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_client_invitations_status" CHECK ("status" IN ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'))
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_client_invitations_token_hash" ON "client_invitations" ("token_hash")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_client_invitations_workspace_email_status" ON "client_invitations" ("workspace_id", "email", "status")`,
    );

    await queryRunner.query(
      `ALTER TABLE "client_invitations" ADD CONSTRAINT "FK_client_invitations_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_invitations" ADD CONSTRAINT "FK_client_invitations_invited_by" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_invitations" ADD CONSTRAINT "FK_client_invitations_accepted_user" FOREIGN KEY ("accepted_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "client_invitations" DROP CONSTRAINT "FK_client_invitations_accepted_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_invitations" DROP CONSTRAINT "FK_client_invitations_invited_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_invitations" DROP CONSTRAINT "FK_client_invitations_workspace"`,
    );

    await queryRunner.query(
      `DROP INDEX "public"."IDX_client_invitations_workspace_email_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_client_invitations_token_hash"`,
    );

    await queryRunner.query(`DROP TABLE "client_invitations"`);
  }
}
