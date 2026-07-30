import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDrawersAndAddressing1722290400000
  implements MigrationInterface
{
  name = "CreateDrawersAndAddressing1722290400000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "samples"
      ALTER COLUMN "voc" TYPE varchar(20)
      USING CASE
        WHEN lower(coalesce("product_base", '')) LIKE '%água%'
          OR lower(coalesce("product_base", '')) LIKE '%agua%'
          THEN 'BASE_AGUA'
        WHEN "voc" IS NOT NULL THEN 'SOLVENTE'
        ELSE NULL
      END
    `);
    await queryRunner.query(`
      CREATE TABLE "drawers" (
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
      INSERT INTO "drawers" ("type", "number")
      SELECT type, number
      FROM unnest(ARRAY['SOLVENTE', 'BASE_AGUA']) AS type
      CROSS JOIN generate_series(0, 9) AS number
    `);
    await queryRunner.query(`
      ALTER TABLE "samples"
      ADD COLUMN "drawer_id" uuid,
      ADD COLUMN "divergence_reason" text,
      ADD CONSTRAINT "FK_samples_drawer"
        FOREIGN KEY ("drawer_id") REFERENCES "drawers"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_samples_drawer_id" ON "samples" ("drawer_id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_samples_drawer_id"`);
    await queryRunner.query(`
      ALTER TABLE "samples"
      DROP CONSTRAINT "FK_samples_drawer",
      DROP COLUMN "divergence_reason",
      DROP COLUMN "drawer_id"
    `);
    await queryRunner.query(`DROP TABLE "drawers"`);
    await queryRunner.query(`
      ALTER TABLE "samples"
      ALTER COLUMN "voc" TYPE numeric(10, 2)
      USING NULL
    `);
  }
}
