import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";
import { INVENTORY_SCHEMA } from "../schema.js";

@Entity({ schema: INVENTORY_SCHEMA, name: "sample_movements" })
export class SampleMovement {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "sample_id", nullable: true })
  sampleId!: string | null;

  @Column({ type: "varchar", name: "sample_reference", length: 80 })
  sampleReference!: string;

  @Column({ type: "varchar", length: 40 })
  event!: string;

  @Column({ type: "uuid", name: "from_drawer_id", nullable: true })
  fromDrawerId!: string | null;

  @Column({ type: "uuid", name: "to_drawer_id", nullable: true })
  toDrawerId!: string | null;

  @Column({ type: "jsonb", nullable: true })
  details!: Record<string, unknown> | null;

  @Column({ type: "varchar", name: "actor_id", length: 100 })
  actorId!: string;

  @Column({
    type: "varchar",
    name: "actor_registration",
    length: 100,
    nullable: true,
  })
  actorRegistration!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
