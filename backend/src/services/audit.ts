import type { EntityManager } from "typeorm";
import { SampleMovement } from "../database/entities/SampleMovement.js";
import type { AuthUser } from "../types/auth.js";

export interface AuditInput {
  sampleId: string | null;
  sampleReference: string;
  event: string;
  fromDrawerId?: string | null;
  toDrawerId?: string | null;
  details?: Record<string, unknown> | null;
}

export const recordMovement = (
  manager: EntityManager,
  actor: AuthUser,
  input: AuditInput,
) =>
  manager.getRepository(SampleMovement).save(
    manager.getRepository(SampleMovement).create({
      ...input,
      fromDrawerId: input.fromDrawerId ?? null,
      toDrawerId: input.toDrawerId ?? null,
      details: input.details ?? null,
      actorId: String(actor.id),
      actorRegistration: actor.matricula ? String(actor.matricula) : null,
    }),
  );
