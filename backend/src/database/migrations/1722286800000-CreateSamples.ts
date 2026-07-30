import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSamples1722286800000 implements MigrationInterface {
  name = "CreateSamples1722286800000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "samples" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "reference" varchar(80) NOT NULL UNIQUE,
        "sample_date" date,
        "manufactured_at" date,
        "expires_at" date,
        "product_base" varchar(120),
        "supplier" varchar(120),
        "color" varchar(120),
        "substrate" varchar(120),
        "voc" numeric(10, 2),
        "paint_application" varchar(120),
        "brand" varchar(120),
        "coat" varchar(40),
        "notes" text,
        "status" varchar(30) NOT NULL DEFAULT 'SEM_ENDERECO',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_samples_expiration"
          CHECK ("expires_at" IS NULL OR "manufactured_at" IS NULL OR "expires_at" >= "manufactured_at")
      )
    `);
    await queryRunner.query(`
      INSERT INTO "samples"
        ("reference", "color", "supplier", "product_base", "voc", "sample_date")
      VALUES
        ('AM-2025-001', 'Preto', 'Fornecedor Alfa', 'Solvente', 420, '2025-01-15'),
        ('AM-2025-002', 'Branco', 'Fornecedor Beta', 'Base água', 95, '2025-02-03'),
        ('PADRAO-AZUL-01', 'Azul', 'Fornecedor Alfa', 'Solvente', 380, '2025-03-10')
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "samples"`);
  }
}
