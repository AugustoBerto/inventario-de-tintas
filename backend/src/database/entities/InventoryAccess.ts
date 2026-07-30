import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type InventoryProfile = "ADMIN" | "OPERATOR" | "VIEWER";

@Entity({ name: "inventory_access_users" })
export class InventoryAccess {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", name: "corporate_user_id", length: 100, unique: true })
  corporateUserId!: string;

  @Column({ type: "varchar", length: 100, nullable: true, unique: true })
  registration!: string | null;

  @Column({ type: "varchar", name: "display_name", length: 180 })
  displayName!: string;

  @Column({ type: "varchar", length: 20 })
  profile!: InventoryProfile;

  @Column({ type: "boolean", default: true })
  active!: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
