import type { MigrationInterface, QueryRunner } from "typeorm";
import { INVENTORY_SCHEMA } from "../schema.js";

const schema = `"${INVENTORY_SCHEMA}"`;

export class InitialAmostrasTintas1785542400000 implements MigrationInterface {
  name = "InitialAmostrasTintas1785542400000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);

    await queryRunner.query(`
      CREATE TABLE ${schema}."inventory_settings" (
        "key" varchar(100) PRIMARY KEY,
        "value" jsonb NOT NULL,
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE ${schema}."drawers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "type" varchar(20) NOT NULL,
        "number" smallint NOT NULL,
        "capacity" smallint NOT NULL DEFAULT 100,
        CONSTRAINT "UQ_drawers_type_number" UNIQUE ("type", "number"),
        CONSTRAINT "CHK_drawers_number" CHECK ("number" BETWEEN 0 AND 9),
        CONSTRAINT "CHK_drawers_capacity" CHECK ("capacity" > 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE ${schema}."samples" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "reference" varchar(80) NOT NULL UNIQUE,
        "sample_date" date,
        "manufactured_at" date,
        "expires_at" date,
        "product_base" varchar(120),
        "supplier" varchar(120),
        "color" varchar(120),
        "substrate" varchar(120),
        "voc" varchar(20),
        "paint_application" varchar(120),
        "brand" varchar(120),
        "coat" varchar(40),
        "notes" text,
        "status" varchar(30) NOT NULL DEFAULT 'SEM_ENDERECO',
        "drawer_id" uuid,
        "divergence_reason" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_samples_expiration"
          CHECK ("expires_at" IS NULL OR "manufactured_at" IS NULL OR "expires_at" >= "manufactured_at"),
        CONSTRAINT "FK_samples_drawer"
          FOREIGN KEY ("drawer_id") REFERENCES ${schema}."drawers"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_samples_drawer_id"
      ON ${schema}."samples" ("drawer_id")
    `);

    await queryRunner.query(`
      CREATE TABLE ${schema}."inventory_access_users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "corporate_user_id" varchar(100) NOT NULL UNIQUE,
        "registration" varchar(100) UNIQUE,
        "display_name" varchar(180) NOT NULL,
        "profile" varchar(20) NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_inventory_access_profile"
          CHECK ("profile" IN ('ADMIN', 'OPERATOR', 'VIEWER'))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE ${schema}."sample_movements" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "sample_id" uuid,
        "sample_reference" varchar(80) NOT NULL,
        "event" varchar(40) NOT NULL,
        "from_drawer_id" uuid,
        "to_drawer_id" uuid,
        "details" jsonb,
        "actor_id" varchar(100) NOT NULL,
        "actor_registration" varchar(100),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_movements_sample"
          FOREIGN KEY ("sample_id") REFERENCES ${schema}."samples"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_movements_from_drawer"
          FOREIGN KEY ("from_drawer_id") REFERENCES ${schema}."drawers"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_movements_to_drawer"
          FOREIGN KEY ("to_drawer_id") REFERENCES ${schema}."drawers"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_sample_movements_sample_id_created_at"
      ON ${schema}."sample_movements" ("sample_id", "created_at" DESC)
    `);

    await queryRunner.query(`
      INSERT INTO ${schema}."inventory_settings" ("key", "value")
      VALUES
        ('foundation', '{"version":"0.2.0"}'::jsonb),
        ('defaultDrawerCapacity', '30'::jsonb),
        ('maxDrawerCapacity', '100'::jsonb),
        ('capacityAlertPercent', '80'::jsonb),
        ('expirationAlertDays', '30'::jsonb)
    `);

    await queryRunner.query(`
      INSERT INTO ${schema}."drawers" ("type", "number")
      SELECT "type", "number"
      FROM unnest(ARRAY['SOLVENTE', 'BASE_AGUA']) AS "types"("type")
      CROSS JOIN generate_series(0, 9) AS "numbers"("number")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE ${schema}."sample_movements"`);
    await queryRunner.query(`DROP TABLE ${schema}."inventory_access_users"`);
    await queryRunner.query(`DROP TABLE ${schema}."samples"`);
    await queryRunner.query(`DROP TABLE ${schema}."drawers"`);
    await queryRunner.query(`DROP TABLE ${schema}."inventory_settings"`);
  }
}
