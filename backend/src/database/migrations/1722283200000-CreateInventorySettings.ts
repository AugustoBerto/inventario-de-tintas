import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInventorySettings1722283200000
  implements MigrationInterface
{
  name = "CreateInventorySettings1722283200000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "inventory_settings" (
        "key" varchar(100) PRIMARY KEY,
        "value" jsonb NOT NULL,
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      INSERT INTO "inventory_settings" ("key", "value")
      VALUES ('foundation', '{"version":"0.2.0"}'::jsonb)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "inventory_settings"`);
  }
}

