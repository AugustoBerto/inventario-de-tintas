import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { INVENTORY_SCHEMA } from "../schema.js";

@Entity({ schema: INVENTORY_SCHEMA, name: "inventory_settings" })
export class InventorySetting {
  @PrimaryColumn({ type: "varchar", length: 100 })
  key!: string;

  @Column({ type: "jsonb" })
  value!: unknown;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
