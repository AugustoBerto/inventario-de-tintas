import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToOne,
} from "typeorm";
import { Drawer } from "./Drawer.js";

@Entity({ name: "samples" })
export class Sample {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 80, unique: true })
  reference!: string;

  @Column({ type: "date", name: "sample_date", nullable: true })
  sampleDate!: string | null;

  @Column({ type: "date", name: "manufactured_at", nullable: true })
  manufacturedAt!: string | null;

  @Column({ type: "date", name: "expires_at", nullable: true })
  expiresAt!: string | null;

  @Column({ type: "varchar", name: "product_base", length: 120, nullable: true })
  productBase!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  supplier!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  color!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  substrate!: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  voc!: string | null;

  @Column({
    type: "varchar",
    name: "paint_application",
    length: 120,
    nullable: true,
  })
  paintApplication!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  brand!: string | null;

  @Column({ type: "varchar", length: 40, nullable: true })
  coat!: string | null;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @Column({ type: "varchar", length: 30, default: "SEM_ENDERECO" })
  status!: string;

  @Column({ type: "uuid", name: "drawer_id", nullable: true })
  drawerId!: string | null;

  @ManyToOne(() => Drawer, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "drawer_id" })
  drawer!: Drawer | null;

  @Column({ type: "text", name: "divergence_reason", nullable: true })
  divergenceReason!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
