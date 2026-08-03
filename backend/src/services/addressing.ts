import type { EntityManager } from "typeorm";
import { Drawer } from "../database/entities/Drawer.js";
import { Sample } from "../database/entities/Sample.js";
import { InventorySetting } from "../database/entities/InventorySetting.js";
import type { AuthUser } from "../types/auth.js";
import { recordMovement } from "./audit.js";

export const drawerSummary = async (manager: EntityManager, drawer: Drawer) => {
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

export const samplesWithAddresses = async (
  manager: EntityManager,
  samples: Sample[],
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
  const todayStr = today.toISOString().slice(0, 10);
  const alertDateStr = alertDate.toISOString().slice(0, 10);

  const drawers = await manager.getRepository(Drawer).find();
  const drawerMap = new Map<string, Drawer>();
  const drawerByKey = new Map<string, Drawer>();
  for (const d of drawers) {
    drawerMap.set(d.id, d);
    drawerByKey.set(`${d.type}_${d.number}`, d);
  }

  const rawCounts: { drawer_id: string; count: string }[] = await manager
    .getRepository(Sample)
    .createQueryBuilder("sample")
    .select("sample.drawer_id", "drawer_id")
    .addSelect("COUNT(sample.id)", "count")
    .where("sample.drawer_id IS NOT NULL")
    .groupBy("sample.drawer_id")
    .getRawMany();

  const occupiedMap = new Map<string, number>();
  for (const row of rawCounts) {
    if (row.drawer_id) {
      occupiedMap.set(row.drawer_id, Number(row.count));
    }
  }

  const getDrawerSummary = (drawer: Drawer) => {
    const occupied = occupiedMap.get(drawer.id) ?? 0;
    return {
      ...drawer,
      occupied,
      available: Math.max(0, drawer.capacity - occupied),
    };
  };

  return samples.map((sample) => {
    const expirationStatus = !sample.expiresAt
      ? "SEM_VALIDADE"
      : sample.expiresAt < todayStr
        ? "VENCIDA"
        : sample.expiresAt <= alertDateStr
          ? "PROXIMA"
          : "VALIDA";

    const drawer = sample.drawerId ? drawerMap.get(sample.drawerId) ?? null : null;

    let recommendation = null;
    if (sample.voc === "SOLVENTE" || sample.voc === "BASE_AGUA") {
      const match = sample.reference.match(/(\d)$/);
      if (match) {
        const key = `${sample.voc}_${Number(match[1])}`;
        const recDrawer = drawerByKey.get(key);
        if (recDrawer) {
          recommendation = getDrawerSummary(recDrawer);
        }
      }
    }

    return {
      ...sample,
      drawer,
      recommendation,
      expirationStatus,
    };
  });
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
    return { kind: "divergent-unconfirmed" as const };
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
    details: divergent
      ? { divergent: true, reason: sample.divergenceReason }
      : null,
  });
  return {
    kind: "ok" as const,
    sample: await sampleWithAddress(manager, sample),
  };
};
