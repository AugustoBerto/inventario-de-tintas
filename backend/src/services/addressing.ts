import type { EntityManager } from "typeorm";
import { Drawer } from "../database/entities/Drawer.js";
import { Sample } from "../database/entities/Sample.js";
import { InventorySetting } from "../database/entities/InventorySetting.js";
import type { AuthUser } from "../types/auth.js";
import { recordMovement } from "./audit.js";

export const drawerSummary = async (
  manager: EntityManager,
  drawer: Drawer,
) => {
  const occupied = await manager.getRepository(Sample).countBy({
    drawerId: drawer.id,
  });
  return {
    ...drawer,
    occupied,
    available: Math.max(0, drawer.capacity - occupied),
  };
};

export const recommendedDrawer = async (
  manager: EntityManager,
  sample: Pick<Sample, "reference" | "voc">,
) => {
  if (sample.voc !== "SOLVENTE" && sample.voc !== "BASE_AGUA") return null;
  const match = sample.reference.match(/(\d)$/);
  if (!match) return null;

  const drawer = await manager.getRepository(Drawer).findOneBy({
    type: sample.voc,
    number: Number(match[1]),
  });
  return drawer ? drawerSummary(manager, drawer) : null;
};

export const sampleWithAddress = async (
  manager: EntityManager,
  sample: Sample,
  expirationAlertDays?: number,
) => {
  const alertDays =
    expirationAlertDays ??
    Number(
      (
        await manager
          .getRepository(InventorySetting)
          .findOneBy({ key: "expirationAlertDays" })
      )?.value ?? 30,
    );
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const alertDate = new Date(today);
  alertDate.setUTCDate(alertDate.getUTCDate() + alertDays);
  const expirationStatus = !sample.expiresAt
    ? "SEM_VALIDADE"
    : sample.expiresAt < today.toISOString().slice(0, 10)
      ? "VENCIDA"
      : sample.expiresAt <= alertDate.toISOString().slice(0, 10)
        ? "PROXIMA"
        : "VALIDA";

  return {
    ...sample,
    drawer: sample.drawerId
      ? await manager.getRepository(Drawer).findOneBy({ id: sample.drawerId })
      : null,
    recommendation: await recommendedDrawer(manager, sample),
    expirationStatus,
  };
};

export const refreshAddressStatus = async (
  manager: EntityManager,
  sample: Sample,
) => {
  if (!sample.drawerId) {
    sample.status = "SEM_ENDERECO";
    sample.divergenceReason = null;
  } else {
    const recommendation = await recommendedDrawer(manager, sample);
    sample.status = !recommendation
      ? "SEM_RECOMENDACAO"
      : recommendation.id === sample.drawerId
        ? "CORRETO"
        : "DIVERGENTE";
    if (sample.status !== "DIVERGENTE") sample.divergenceReason = null;
  }
  return manager.getRepository(Sample).save(sample);
};

export const moveSample = async (
  manager: EntityManager,
  sampleId: string,
  drawerId: string,
  confirmDivergence: boolean,
  actor: AuthUser,
  reason?: string,
) => {
  const sampleRepository = manager.getRepository(Sample);
  const drawerRepository = manager.getRepository(Drawer);
  const sample = await sampleRepository.findOne({
    where: { id: sampleId },
    lock: { mode: "pessimistic_write" },
  });
  if (!sample) return { kind: "not-found" as const };

  const drawer = await drawerRepository.findOne({
    where: { id: drawerId },
    lock: { mode: "pessimistic_write" },
  });
  if (!drawer) return { kind: "drawer-not-found" as const };

  const occupied = await sampleRepository.countBy({ drawerId });
  if (sample.drawerId !== drawerId && occupied >= drawer.capacity) {
    return { kind: "full" as const };
  }

  const recommendation = await recommendedDrawer(manager, sample);
  const divergent = Boolean(recommendation && recommendation.id !== drawerId);
  if (divergent && !confirmDivergence) {
    return { kind: "confirmation-required" as const, recommendation };
  }

  const fromDrawerId = sample.drawerId;
  sample.drawerId = drawerId;
  sample.status = !recommendation
    ? "SEM_RECOMENDACAO"
    : divergent
      ? "DIVERGENTE"
      : "CORRETO";
  sample.divergenceReason = divergent ? reason?.trim() || null : null;
  await sampleRepository.save(sample);
  await recordMovement(manager, actor, {
    sampleId: sample.id,
    sampleReference: sample.reference,
    event: fromDrawerId ? "MOVED" : "ADDRESSED",
    fromDrawerId,
    toDrawerId: drawerId,
    details: divergent ? { divergent: true, reason: sample.divergenceReason } : null,
  });
  return {
    kind: "ok" as const,
    sample: await sampleWithAddress(manager, sample),
  };
};
