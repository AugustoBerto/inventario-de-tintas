import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAccessSettingsAndHistory1722294000000
  implements MigrationInterface
{
  name = "CreateAccessSettingsAndHistory1722294000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "inventory_access_users" (
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
      CREATE TABLE "sample_movements" (
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
          FOREIGN KEY ("sample_id") REFERENCES "samples"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_movements_from_drawer"
          FOREIGN KEY ("from_drawer_id") REFERENCES "drawers"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_movements_to_drawer"
          FOREIGN KEY ("to_drawer_id") REFERENCES "drawers"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_sample_movements_sample_id_created_at"
      ON "sample_movements" ("sample_id", "created_at" DESC)
    `);
    await queryRunner.query(`
      INSERT INTO "inventory_settings" ("key", "value")
      VALUES
        ('defaultDrawerCapacity', '100'::jsonb),
        ('capacityAlertPercent', '80'::jsonb),
        ('expirationAlertDays', '30'::jsonb)
      ON CONFLICT ("key") DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "inventory_settings" WHERE "key" IN ('defaultDrawerCapacity', 'capacityAlertPercent', 'expirationAlertDays')`);
    await queryRunner.query(`DROP TABLE "sample_movements"`);
    await queryRunner.query(`DROP TABLE "inventory_access_users"`);
  }
}
