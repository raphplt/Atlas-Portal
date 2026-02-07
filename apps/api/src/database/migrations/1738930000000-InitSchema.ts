import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1738930000000 implements MigrationInterface {
  name = 'InitSchema1738930000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"`);

    await queryRunner.query(`CREATE TYPE \"user_role_enum\" AS ENUM ('ADMIN', 'CLIENT')`);
    await queryRunner.query(
      `CREATE TYPE \"project_status_enum\" AS ENUM ('IN_PROGRESS', 'WAITING_CLIENT', 'COMPLETED')`,
    );
    await queryRunner.query(`CREATE TYPE \"task_source_enum\" AS ENUM ('CORE', 'TICKET')`);
    await queryRunner.query(
      `CREATE TYPE \"task_status_enum\" AS ENUM ('BACKLOG', 'IN_PROGRESS', 'BLOCKED_BY_CLIENT', 'DONE')`,
    );
    await queryRunner.query(
      `CREATE TYPE \"ticket_type_enum\" AS ENUM ('BUG', 'MODIFICATION', 'IMPROVEMENT', 'QUESTION')`,
    );
    await queryRunner.query(
      `CREATE TYPE \"ticket_status_enum\" AS ENUM ('OPEN', 'NEEDS_INFO', 'ACCEPTED', 'REJECTED', 'PAYMENT_REQUIRED', 'PAID', 'CONVERTED')`,
    );
    await queryRunner.query(`CREATE TYPE \"file_category_enum\" AS ENUM ('BRANDING', 'CONTENT', 'DELIVERABLE', 'OTHER')`);
    await queryRunner.query(`CREATE TYPE \"payment_status_enum\" AS ENUM ('PENDING', 'PAID', 'CANCELED', 'EXPIRED')`);
    await queryRunner.query(`CREATE TYPE \"milestone_type_enum\" AS ENUM ('DESIGN', 'CONTENT', 'DELIVERY')`);

    await queryRunner.query(`
      CREATE TABLE \"workspaces\" (
        \"id\" uuid NOT NULL DEFAULT uuid_generate_v4(),
        \"name\" character varying(120) NOT NULL,
        \"slug\" character varying(120) NOT NULL,
        \"emailSenderName\" character varying(320),
        \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT \"PK_workspaces_id\" PRIMARY KEY (\"id\"),
        CONSTRAINT \"UQ_workspaces_slug\" UNIQUE (\"slug\")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE \"users\" (
        \"id\" uuid NOT NULL DEFAULT uuid_generate_v4(),
        \"workspace_id\" uuid NOT NULL,
        \"email\" character varying(320) NOT NULL,
        \"password_hash\" character varying(255) NOT NULL,
        \"role\" \"user_role_enum\" NOT NULL,
        \"locale\" character varying(2) NOT NULL DEFAULT 'en',
        \"firstName\" character varying(120),
        \"lastName\" character varying(120),
        \"isActive\" boolean NOT NULL DEFAULT true,
        \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT \"PK_users_id\" PRIMARY KEY (\"id\"),
        CONSTRAINT \"UQ_users_workspace_email\" UNIQUE (\"workspace_id\", \"email\")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE \"refresh_tokens\" (
        \"id\" uuid NOT NULL,
        \"user_id\" uuid NOT NULL,
        \"token_hash\" character varying(255) NOT NULL,
        \"expires_at\" TIMESTAMP WITH TIME ZONE NOT NULL,
        \"revoked_at\" TIMESTAMP WITH TIME ZONE,
        \"replaced_by_token_id\" uuid,
        \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT \"PK_refresh_tokens_id\" PRIMARY KEY (\"id\")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE \"projects\" (
        \"id\" uuid NOT NULL DEFAULT uuid_generate_v4(),
        \"workspace_id\" uuid NOT NULL,
        \"client_id\" uuid NOT NULL,
        \"name\" character varying(180) NOT NULL,
        \"description\" text,
        \"status\" \"project_status_enum\" NOT NULL DEFAULT 'IN_PROGRESS',
        \"progress\" integer NOT NULL DEFAULT 0,
        \"next_action\" character varying(255),
        \"last_update_author_id\" uuid,
        \"estimated_delivery_at\" TIMESTAMP WITH TIME ZONE,
        \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        \"updated_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT \"PK_projects_id\" PRIMARY KEY (\"id\")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE \"tasks\" (
        \"id\" uuid NOT NULL DEFAULT uuid_generate_v4(),
        \"workspace_id\" uuid NOT NULL,
        \"project_id\" uuid NOT NULL,
        \"source\" \"task_source_enum\" NOT NULL,
        \"title\" character varying(180) NOT NULL,
        \"description\" text,
        \"status\" \"task_status_enum\" NOT NULL DEFAULT 'BACKLOG',
        \"blocked_reason\" character varying(255),
        \"position\" integer NOT NULL DEFAULT 0,
        \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        \"updated_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT \"PK_tasks_id\" PRIMARY KEY (\"id\")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE \"tickets\" (
        \"id\" uuid NOT NULL DEFAULT uuid_generate_v4(),
        \"workspace_id\" uuid NOT NULL,
        \"project_id\" uuid NOT NULL,
        \"created_by_id\" uuid NOT NULL,
        \"type\" \"ticket_type_enum\" NOT NULL,
        \"title\" character varying(180) NOT NULL,
        \"description\" text NOT NULL,
        \"status\" \"ticket_status_enum\" NOT NULL DEFAULT 'OPEN',
        \"requires_payment\" boolean NOT NULL DEFAULT false,
        \"price_cents\" integer,
        \"currency\" character varying(3) NOT NULL DEFAULT 'EUR',
        \"payment_description\" character varying(255),
        \"converted_task_id\" uuid,
        \"is_deleted\" boolean NOT NULL DEFAULT false,
        \"deleted_at\" TIMESTAMP WITH TIME ZONE,
        \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        \"updated_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT \"PK_tickets_id\" PRIMARY KEY (\"id\"),
        CONSTRAINT \"UQ_tickets_converted_task_id\" UNIQUE (\"converted_task_id\")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE \"messages\" (
        \"id\" uuid NOT NULL DEFAULT uuid_generate_v4(),
        \"workspace_id\" uuid NOT NULL,
        \"project_id\" uuid NOT NULL,
        \"author_id\" uuid NOT NULL,
        \"ticket_id\" uuid,
        \"body\" text NOT NULL,
        \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT \"PK_messages_id\" PRIMARY KEY (\"id\")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE \"file_assets\" (
        \"id\" uuid NOT NULL DEFAULT uuid_generate_v4(),
        \"workspace_id\" uuid NOT NULL,
        \"project_id\" uuid NOT NULL,
        \"uploader_id\" uuid NOT NULL,
        \"category\" \"file_category_enum\" NOT NULL DEFAULT 'OTHER',
        \"original_name\" character varying(255) NOT NULL,
        \"key\" character varying(255) NOT NULL,
        \"content_type\" character varying(120) NOT NULL,
        \"size_bytes\" bigint NOT NULL,
        \"checksum\" character varying(128),
        \"version_label\" character varying(32),
        \"ticket_id\" uuid,
        \"message_id\" uuid,
        \"is_uploaded\" boolean NOT NULL DEFAULT false,
        \"is_deleted\" boolean NOT NULL DEFAULT false,
        \"deleted_at\" TIMESTAMP WITH TIME ZONE,
        \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        \"updated_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT \"PK_file_assets_id\" PRIMARY KEY (\"id\")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE \"payments\" (
        \"id\" uuid NOT NULL DEFAULT uuid_generate_v4(),
        \"workspace_id\" uuid NOT NULL,
        \"project_id\" uuid NOT NULL,
        \"ticket_id\" uuid,
        \"created_by_id\" uuid NOT NULL,
        \"title\" character varying(180) NOT NULL,
        \"description\" text,
        \"amount_cents\" integer NOT NULL,
        \"currency\" character varying(3) NOT NULL DEFAULT 'EUR',
        \"status\" \"payment_status_enum\" NOT NULL DEFAULT 'PENDING',
        \"stripe_checkout_session_id\" character varying(255),
        \"stripe_payment_intent_id\" character varying(255),
        \"due_at\" TIMESTAMP WITH TIME ZONE,
        \"paid_at\" TIMESTAMP WITH TIME ZONE,
        \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        \"updated_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT \"PK_payments_id\" PRIMARY KEY (\"id\")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE \"audit_events\" (
        \"id\" uuid NOT NULL DEFAULT uuid_generate_v4(),
        \"workspace_id\" uuid NOT NULL,
        \"project_id\" uuid,
        \"actor_id\" uuid,
        \"action\" character varying(120) NOT NULL,
        \"resource_type\" character varying(80) NOT NULL,
        \"resource_id\" character varying(120) NOT NULL,
        \"metadata\" jsonb NOT NULL DEFAULT '{}'::jsonb,
        \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT \"PK_audit_events_id\" PRIMARY KEY (\"id\")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE \"admin_notes\" (
        \"id\" uuid NOT NULL DEFAULT uuid_generate_v4(),
        \"workspace_id\" uuid NOT NULL,
        \"project_id\" uuid NOT NULL,
        \"author_id\" uuid NOT NULL,
        \"content\" text NOT NULL,
        \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        \"updated_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT \"PK_admin_notes_id\" PRIMARY KEY (\"id\")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE \"milestone_validations\" (
        \"id\" uuid NOT NULL DEFAULT uuid_generate_v4(),
        \"workspace_id\" uuid NOT NULL,
        \"project_id\" uuid NOT NULL,
        \"type\" \"milestone_type_enum\" NOT NULL,
        \"validated\" boolean NOT NULL DEFAULT false,
        \"validated_by_id\" uuid,
        \"validated_at\" TIMESTAMP WITH TIME ZONE,
        \"comment\" character varying(255),
        \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        \"updated_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT \"PK_milestone_validations_id\" PRIMARY KEY (\"id\"),
        CONSTRAINT \"UQ_milestone_project_type\" UNIQUE (\"workspace_id\", \"project_id\", \"type\")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE \"stripe_events\" (
        \"id\" character varying(255) NOT NULL,
        \"event_type\" character varying(80) NOT NULL,
        \"processed_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT \"PK_stripe_events_id\" PRIMARY KEY (\"id\")
      )
    `);

    await queryRunner.query(`CREATE INDEX \"IDX_refresh_tokens_user_revoked\" ON \"refresh_tokens\" (\"user_id\", \"revoked_at\")`);
    await queryRunner.query(`CREATE INDEX \"IDX_projects_workspace_created\" ON \"projects\" (\"workspace_id\", \"created_at\")`);
    await queryRunner.query(`CREATE INDEX \"IDX_tasks_workspace_project_status\" ON \"tasks\" (\"workspace_id\", \"project_id\", \"status\")`);
    await queryRunner.query(`CREATE INDEX \"IDX_tickets_workspace_project_status\" ON \"tickets\" (\"workspace_id\", \"project_id\", \"status\")`);
    await queryRunner.query(`CREATE INDEX \"IDX_messages_workspace_project_created\" ON \"messages\" (\"workspace_id\", \"project_id\", \"created_at\")`);
    await queryRunner.query(`CREATE INDEX \"IDX_files_workspace_project_created\" ON \"file_assets\" (\"workspace_id\", \"project_id\", \"created_at\")`);
    await queryRunner.query(`CREATE INDEX \"IDX_payments_workspace_project_status\" ON \"payments\" (\"workspace_id\", \"project_id\", \"status\")`);
    await queryRunner.query(`CREATE INDEX \"IDX_audit_workspace_project_created\" ON \"audit_events\" (\"workspace_id\", \"project_id\", \"created_at\")`);
    await queryRunner.query(`CREATE INDEX \"IDX_notes_workspace_project_created\" ON \"admin_notes\" (\"workspace_id\", \"project_id\", \"created_at\")`);

    await queryRunner.query(`ALTER TABLE \"users\" ADD CONSTRAINT \"FK_users_workspace\" FOREIGN KEY (\"workspace_id\") REFERENCES \"workspaces\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \"refresh_tokens\" ADD CONSTRAINT \"FK_refresh_tokens_user\" FOREIGN KEY (\"user_id\") REFERENCES \"users\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \"projects\" ADD CONSTRAINT \"FK_projects_workspace\" FOREIGN KEY (\"workspace_id\") REFERENCES \"workspaces\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \"projects\" ADD CONSTRAINT \"FK_projects_client\" FOREIGN KEY (\"client_id\") REFERENCES \"users\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE \"tasks\" ADD CONSTRAINT \"FK_tasks_workspace\" FOREIGN KEY (\"workspace_id\") REFERENCES \"workspaces\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \"tasks\" ADD CONSTRAINT \"FK_tasks_project\" FOREIGN KEY (\"project_id\") REFERENCES \"projects\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE \"tickets\" ADD CONSTRAINT \"FK_tickets_workspace\" FOREIGN KEY (\"workspace_id\") REFERENCES \"workspaces\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \"tickets\" ADD CONSTRAINT \"FK_tickets_project\" FOREIGN KEY (\"project_id\") REFERENCES \"projects\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \"tickets\" ADD CONSTRAINT \"FK_tickets_created_by\" FOREIGN KEY (\"created_by_id\") REFERENCES \"users\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \"tickets\" ADD CONSTRAINT \"FK_tickets_converted_task\" FOREIGN KEY (\"converted_task_id\") REFERENCES \"tasks\"(\"id\") ON DELETE SET NULL ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE \"messages\" ADD CONSTRAINT \"FK_messages_workspace\" FOREIGN KEY (\"workspace_id\") REFERENCES \"workspaces\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \"messages\" ADD CONSTRAINT \"FK_messages_project\" FOREIGN KEY (\"project_id\") REFERENCES \"projects\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \"messages\" ADD CONSTRAINT \"FK_messages_author\" FOREIGN KEY (\"author_id\") REFERENCES \"users\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \"messages\" ADD CONSTRAINT \"FK_messages_ticket\" FOREIGN KEY (\"ticket_id\") REFERENCES \"tickets\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE \"file_assets\" ADD CONSTRAINT \"FK_file_assets_workspace\" FOREIGN KEY (\"workspace_id\") REFERENCES \"workspaces\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \"file_assets\" ADD CONSTRAINT \"FK_file_assets_project\" FOREIGN KEY (\"project_id\") REFERENCES \"projects\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \"file_assets\" ADD CONSTRAINT \"FK_file_assets_uploader\" FOREIGN KEY (\"uploader_id\") REFERENCES \"users\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE \"payments\" ADD CONSTRAINT \"FK_payments_workspace\" FOREIGN KEY (\"workspace_id\") REFERENCES \"workspaces\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \"payments\" ADD CONSTRAINT \"FK_payments_project\" FOREIGN KEY (\"project_id\") REFERENCES \"projects\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \"payments\" ADD CONSTRAINT \"FK_payments_ticket\" FOREIGN KEY (\"ticket_id\") REFERENCES \"tickets\"(\"id\") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \"payments\" ADD CONSTRAINT \"FK_payments_created_by\" FOREIGN KEY (\"created_by_id\") REFERENCES \"users\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE \"audit_events\" ADD CONSTRAINT \"FK_audit_workspace\" FOREIGN KEY (\"workspace_id\") REFERENCES \"workspaces\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \"audit_events\" ADD CONSTRAINT \"FK_audit_project\" FOREIGN KEY (\"project_id\") REFERENCES \"projects\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \"audit_events\" ADD CONSTRAINT \"FK_audit_actor\" FOREIGN KEY (\"actor_id\") REFERENCES \"users\"(\"id\") ON DELETE SET NULL ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE \"admin_notes\" ADD CONSTRAINT \"FK_admin_notes_workspace\" FOREIGN KEY (\"workspace_id\") REFERENCES \"workspaces\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \"admin_notes\" ADD CONSTRAINT \"FK_admin_notes_project\" FOREIGN KEY (\"project_id\") REFERENCES \"projects\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \"admin_notes\" ADD CONSTRAINT \"FK_admin_notes_author\" FOREIGN KEY (\"author_id\") REFERENCES \"users\"(\"id\") ON DELETE RESTRICT ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE \"milestone_validations\" ADD CONSTRAINT \"FK_milestone_workspace\" FOREIGN KEY (\"workspace_id\") REFERENCES \"workspaces\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \"milestone_validations\" ADD CONSTRAINT \"FK_milestone_project\" FOREIGN KEY (\"project_id\") REFERENCES \"projects\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE \"milestone_validations\" ADD CONSTRAINT \"FK_milestone_validated_by\" FOREIGN KEY (\"validated_by_id\") REFERENCES \"users\"(\"id\") ON DELETE SET NULL ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \"milestone_validations\" DROP CONSTRAINT \"FK_milestone_validated_by\"`);
    await queryRunner.query(`ALTER TABLE \"milestone_validations\" DROP CONSTRAINT \"FK_milestone_project\"`);
    await queryRunner.query(`ALTER TABLE \"milestone_validations\" DROP CONSTRAINT \"FK_milestone_workspace\"`);
    await queryRunner.query(`ALTER TABLE \"admin_notes\" DROP CONSTRAINT \"FK_admin_notes_author\"`);
    await queryRunner.query(`ALTER TABLE \"admin_notes\" DROP CONSTRAINT \"FK_admin_notes_project\"`);
    await queryRunner.query(`ALTER TABLE \"admin_notes\" DROP CONSTRAINT \"FK_admin_notes_workspace\"`);
    await queryRunner.query(`ALTER TABLE \"audit_events\" DROP CONSTRAINT \"FK_audit_actor\"`);
    await queryRunner.query(`ALTER TABLE \"audit_events\" DROP CONSTRAINT \"FK_audit_project\"`);
    await queryRunner.query(`ALTER TABLE \"audit_events\" DROP CONSTRAINT \"FK_audit_workspace\"`);
    await queryRunner.query(`ALTER TABLE \"payments\" DROP CONSTRAINT \"FK_payments_created_by\"`);
    await queryRunner.query(`ALTER TABLE \"payments\" DROP CONSTRAINT \"FK_payments_ticket\"`);
    await queryRunner.query(`ALTER TABLE \"payments\" DROP CONSTRAINT \"FK_payments_project\"`);
    await queryRunner.query(`ALTER TABLE \"payments\" DROP CONSTRAINT \"FK_payments_workspace\"`);
    await queryRunner.query(`ALTER TABLE \"file_assets\" DROP CONSTRAINT \"FK_file_assets_uploader\"`);
    await queryRunner.query(`ALTER TABLE \"file_assets\" DROP CONSTRAINT \"FK_file_assets_project\"`);
    await queryRunner.query(`ALTER TABLE \"file_assets\" DROP CONSTRAINT \"FK_file_assets_workspace\"`);
    await queryRunner.query(`ALTER TABLE \"messages\" DROP CONSTRAINT \"FK_messages_ticket\"`);
    await queryRunner.query(`ALTER TABLE \"messages\" DROP CONSTRAINT \"FK_messages_author\"`);
    await queryRunner.query(`ALTER TABLE \"messages\" DROP CONSTRAINT \"FK_messages_project\"`);
    await queryRunner.query(`ALTER TABLE \"messages\" DROP CONSTRAINT \"FK_messages_workspace\"`);
    await queryRunner.query(`ALTER TABLE \"tickets\" DROP CONSTRAINT \"FK_tickets_converted_task\"`);
    await queryRunner.query(`ALTER TABLE \"tickets\" DROP CONSTRAINT \"FK_tickets_created_by\"`);
    await queryRunner.query(`ALTER TABLE \"tickets\" DROP CONSTRAINT \"FK_tickets_project\"`);
    await queryRunner.query(`ALTER TABLE \"tickets\" DROP CONSTRAINT \"FK_tickets_workspace\"`);
    await queryRunner.query(`ALTER TABLE \"tasks\" DROP CONSTRAINT \"FK_tasks_project\"`);
    await queryRunner.query(`ALTER TABLE \"tasks\" DROP CONSTRAINT \"FK_tasks_workspace\"`);
    await queryRunner.query(`ALTER TABLE \"projects\" DROP CONSTRAINT \"FK_projects_client\"`);
    await queryRunner.query(`ALTER TABLE \"projects\" DROP CONSTRAINT \"FK_projects_workspace\"`);
    await queryRunner.query(`ALTER TABLE \"refresh_tokens\" DROP CONSTRAINT \"FK_refresh_tokens_user\"`);
    await queryRunner.query(`ALTER TABLE \"users\" DROP CONSTRAINT \"FK_users_workspace\"`);

    await queryRunner.query(`DROP INDEX \"public\".\"IDX_notes_workspace_project_created\"`);
    await queryRunner.query(`DROP INDEX \"public\".\"IDX_audit_workspace_project_created\"`);
    await queryRunner.query(`DROP INDEX \"public\".\"IDX_payments_workspace_project_status\"`);
    await queryRunner.query(`DROP INDEX \"public\".\"IDX_files_workspace_project_created\"`);
    await queryRunner.query(`DROP INDEX \"public\".\"IDX_messages_workspace_project_created\"`);
    await queryRunner.query(`DROP INDEX \"public\".\"IDX_tickets_workspace_project_status\"`);
    await queryRunner.query(`DROP INDEX \"public\".\"IDX_tasks_workspace_project_status\"`);
    await queryRunner.query(`DROP INDEX \"public\".\"IDX_projects_workspace_created\"`);
    await queryRunner.query(`DROP INDEX \"public\".\"IDX_refresh_tokens_user_revoked\"`);

    await queryRunner.query(`DROP TABLE \"stripe_events\"`);
    await queryRunner.query(`DROP TABLE \"milestone_validations\"`);
    await queryRunner.query(`DROP TABLE \"admin_notes\"`);
    await queryRunner.query(`DROP TABLE \"audit_events\"`);
    await queryRunner.query(`DROP TABLE \"payments\"`);
    await queryRunner.query(`DROP TABLE \"file_assets\"`);
    await queryRunner.query(`DROP TABLE \"messages\"`);
    await queryRunner.query(`DROP TABLE \"tickets\"`);
    await queryRunner.query(`DROP TABLE \"tasks\"`);
    await queryRunner.query(`DROP TABLE \"projects\"`);
    await queryRunner.query(`DROP TABLE \"refresh_tokens\"`);
    await queryRunner.query(`DROP TABLE \"users\"`);
    await queryRunner.query(`DROP TABLE \"workspaces\"`);

    await queryRunner.query(`DROP TYPE \"milestone_type_enum\"`);
    await queryRunner.query(`DROP TYPE \"payment_status_enum\"`);
    await queryRunner.query(`DROP TYPE \"file_category_enum\"`);
    await queryRunner.query(`DROP TYPE \"ticket_status_enum\"`);
    await queryRunner.query(`DROP TYPE \"ticket_type_enum\"`);
    await queryRunner.query(`DROP TYPE \"task_status_enum\"`);
    await queryRunner.query(`DROP TYPE \"task_source_enum\"`);
    await queryRunner.query(`DROP TYPE \"project_status_enum\"`);
    await queryRunner.query(`DROP TYPE \"user_role_enum\"`);
  }
}
