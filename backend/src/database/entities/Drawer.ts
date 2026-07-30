import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

export type DrawerType = "SOLVENTE" | "BASE_AGUA";

@Entity({ name: "drawers" })
@Unique("UQ_drawers_type_number", ["type", "number"])
export class Drawer {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 20 })
  type!: DrawerType;

  @Column({ type: "smallint" })
  number!: number;

  @Column({ type: "smallint", default: 100 })
  capacity!: number;
}
