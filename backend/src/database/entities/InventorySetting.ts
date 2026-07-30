import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "inventory_settings" })
export class InventorySetting {
  @PrimaryColumn({ type: "varchar", length: 100 })
  key!: string;

  @Column({ type: "jsonb" })
  value!: unknown;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}

