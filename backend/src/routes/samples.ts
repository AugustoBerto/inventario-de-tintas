import { Router } from "express";
import type { DataSource } from "typeorm";
import { QueryFailedError } from "typeorm";
import { z } from "zod";
import { Sample } from "../database/entities/Sample.js";
import { SampleMovement } from "../database/entities/SampleMovement.js";
import { InventorySetting } from "../database/entities/InventorySetting.js";
import { Drawer } from "../database/entities/Drawer.js";
import { authenticate } from "../middleware/authenticate.js";
import {
  authorize,
  loadInventoryAccess,
} from "../middleware/inventory-access.js";
import {
  moveSample,
  drawerSummary,
  recommendedDrawer,
  refreshAddressStatus,
  sampleWithAddress,
  samplesWithAddresses,
} from "../services/addressing.js";
import { recordMovement } from "../services/audit.js";
import { BatchPreviewCapacity } from "../services/batch-preview.js";

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null ? undefined : value;
const optionalText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());
const optionalDate = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.")
    .optional(),
);
const optionalVoc = z.preprocess(
  emptyToUndefined,
  z.enum(["SOLVENTE", "BASE_AGUA"]).optional(),
);

const sampleFieldsSchema = z.object({
  expiresAt: optionalDate,
  productBase: optionalText(120),
  supplier: optionalText(120),
  color: optionalText(120),
  substrate: optionalText(120),
  voc: optionalVoc,
  paintApplication: optionalText(120),
  brand: optionalText(120),
  coat: optionalText(40),
  notes: optionalText(4000),
});
const sampleInputSchema = sampleFieldsSchema;

const createSampleSchema = sampleInputSchema.and(
  z.object({
    reference: z
      .string()
      .trim()
      .min(1, "Informe a referência.")
      .max(80)
      .transform((value) => value.toUpperCase()),
    drawerId: z.string().uuid().optional().nullable(),
    addressRecommended: z.boolean().default(true),
  }),
);
const updateSampleSchema = sampleFieldsSchema.partial();
const clearableFields = [
  "expiresAt",
  "productBase",
  "supplier",
  "color",
  "substrate",
  "voc",
  "paintApplication",
  "brand",
  "coat",
  "notes",
] as const;
const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(80).default(""),
  color: z.string().trim().max(120).optional(),
  supplier: z.string().trim().max(120).optional(),
  brand: z.string().trim().max(120).optional(),
  productBase: z.string().trim().max(120).optional(),
  substrate: z.string().trim().max(120).optional(),
  voc: z.enum(["SOLVENTE", "BASE_AGUA"]).optional(),
  paintApplication: z.string().trim().max(120).optional(),
  coat: z.string().trim().max(40).optional(),
  /* DESABILITADO: Data da amostra / Fabricação
  sampleDate: optionalDate,
  manufacturedAt: optionalDate,
  */
  expiresAt: optionalDate,
  expirationStatus: z
    .enum(["SEM_VALIDADE", "VALIDA", "PROXIMA", "VENCIDA"])
    .optional(),
  drawerId: z.string().uuid().optional(),
  status: z
    .enum(["SEM_ENDERECO", "CORRETO", "DIVERGENTE", "SEM_RECOMENDACAO"])
    .optional(),
  createdDate: optionalDate,
  sort: z.enum(["reference", "expiresAt", "createdAt"]).default("reference"),
  order: z.enum(["ASC", "DESC"]).default("ASC"),
});
const moveSchema = z.object({
  drawerId: z.string().uuid("Selecione uma gaveta."),
  confirmDivergence: z.boolean().default(false),
  reason: z.string().trim().max(500).optional(),
});
const batchSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  preview: z.boolean().default(true),
  drawerId: z.string().uuid().optional(),
});

const validationError = (error: z.ZodError) => ({
  message: "Revise os campos informados.",
  fields: Object.fromEntries(
    error.issues.map((issue) => [
      String(issue.path[0] ?? "form"),
      issue.message,
    ]),
  ),
});

const isDuplicate = (error: unknown) =>
  error instanceof QueryFailedError &&
  (error.driverError as { code?: string }).code === "23505";

export const createSamplesRouter = (dataSource: DataSource) => {
  const router = Router();
  const repository = dataSource.getRepository(Sample);

  router.use(authenticate, loadInventoryAccess(dataSource));

  router.get("/", async (req, res, next) => {
    const parsed = listSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json(validationError(parsed.error));
      return;
    }

    try {
      const { page, limit, search, order, sort, ...filters } = parsed.data;
      const setting = await dataSource
        .getRepository(InventorySetting)
        .findOneBy({ key: "expirationAlertDays" });
      const alertDays = Number(setting?.value ?? 30);
      const query = repository.createQueryBuilder("sample");
      const partialFields = [
        "color",
        "supplier",
        "brand",
        "productBase",
        "substrate",
        "paintApplication",
        "coat",
      ] as const;
      if (search)
        query.andWhere("sample.reference ILIKE :search", {
          search: `%${search}%`,
        });
      for (const field of partialFields) {
        if (filters[field]) {
          query.andWhere(`sample.${field} ILIKE :${field}`, {
            [field]: `%${filters[field]}%`,
          });
        }
      }
      if (filters.voc)
        query.andWhere("sample.voc = :voc", { voc: filters.voc });
      if (filters.drawerId)
        query.andWhere("sample.drawerId = :drawerId", {
          drawerId: filters.drawerId,
        });
      if (filters.status)
        query.andWhere("sample.status = :status", { status: filters.status });
      for (const field of [
        /* DESABILITADO: Data da amostra / Fabricação
        "sampleDate",
        "manufacturedAt",
        */
        "expiresAt",
      ] as const) {
        if (filters[field])
          query.andWhere(`sample.${field} = :${field}`, {
            [field]: filters[field],
          });
      }
      if (filters.createdDate) {
        query.andWhere("sample.createdAt::date = :createdDate", {
          createdDate: filters.createdDate,
        });
      }
      if (filters.expirationStatus === "SEM_VALIDADE")
        query.andWhere("sample.expiresAt IS NULL");
      if (filters.expirationStatus === "VENCIDA")
        query.andWhere("sample.expiresAt < CURRENT_DATE");
      if (filters.expirationStatus === "PROXIMA") {
        query.andWhere(
          "sample.expiresAt >= CURRENT_DATE AND sample.expiresAt <= CURRENT_DATE + (:alertDays * INTERVAL '1 day')",
          { alertDays },
        );
      }
      if (filters.expirationStatus === "VALIDA") {
        query.andWhere(
          "sample.expiresAt > CURRENT_DATE + (:alertDays * INTERVAL '1 day')",
          { alertDays },
        );
      }
      const sortColumn = {
        reference: "sample.reference",
        expiresAt: "sample.expiresAt",
        createdAt: "sample.createdAt",
      }[sort];
      const [items, total] = await query
        .orderBy(sortColumn, order, "NULLS LAST")
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();
      const counters = await repository
        .createQueryBuilder("sample")
        .select("COUNT(*)", "total")
        .addSelect(
          "COUNT(*) FILTER (WHERE sample.drawerId IS NULL)",
          "withoutAddress",
        )
        .addSelect(
          "COUNT(*) FILTER (WHERE sample.expiresAt < CURRENT_DATE)",
          "expired",
        )
        .addSelect(
          "COUNT(*) FILTER (WHERE sample.expiresAt >= CURRENT_DATE AND sample.expiresAt <= CURRENT_DATE + (:alertDays * INTERVAL '1 day'))",
          "expiring",
        )
        .setParameter("alertDays", alertDays)
        .getRawOne();
      res.json({
        items: await samplesWithAddresses(
          dataSource.manager,
          items,
          alertDays,
        ),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
        counters: Object.fromEntries(
          Object.entries(counters ?? {}).map(([key, value]) => [
            key,
            Number(value),
          ]),
        ),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const sample = await repository.findOneBy({ id: String(req.params.id) });
      if (!sample) {
        res.status(404).json({ message: "Amostra não encontrada." });
        return;
      }
      res.json(await sampleWithAddress(dataSource.manager, sample));
    } catch (error) {
      next(error);
    }
  });

  router.post("/", authorize("ADMIN", "OPERATOR"), async (req, res, next) => {
    const parsed = createSampleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(validationError(parsed.error));
      return;
    }

    try {
      const saved = await dataSource.transaction(async (manager) => {
        const { addressRecommended, drawerId, ...values } = parsed.data;
        const transactionRepository = manager.getRepository(Sample);
        const sample = await transactionRepository.save(
          transactionRepository.create({
            ...values,
            status: "SEM_ENDERECO",
          }),
        );
        await recordMovement(manager, req.authUser!, {
          sampleId: sample.id,
          sampleReference: sample.reference,
          event: "CRIADO",
        });

        // Se uma gaveta foi selecionada explicitamente no cadastro, endereça nela
        if (drawerId) {
          const result = await moveSample(
            manager,
            sample.id,
            drawerId,
            true,
            req.authUser!,
          );
          if (result.kind === "full") {
            throw new Error("DRAWER_FULL");
          }
          if (result.kind === "ok") return result.sample;
        } else {
          // Caso contrário, tenta endereçamento automático na gaveta recomendada por padrão
          const recommendation = await recommendedDrawer(manager, sample);
          if (recommendation?.available) {
            const result = await moveSample(
              manager,
              sample.id,
              recommendation.id,
              true,
              req.authUser!,
            );
            if (result.kind === "ok") return result.sample;
          }
        }

        return sampleWithAddress(manager, sample);
      });
      res.status(201).json(saved);
    } catch (error: any) {
      if (error?.message === "DRAWER_FULL") {
        res.status(409).json({ message: "A gaveta selecionada está lotada." });
        return;
      }
      if (isDuplicate(error)) {
        res.status(409).json({
          message: "Já existe uma amostra com esta referência.",
          fields: { reference: "Esta referência já está cadastrada." },
        });
        return;
      }
      next(error);
    }
  });

  router.patch(
    "/:id",
    authorize("ADMIN", "OPERATOR"),
    async (req, res, next) => {
      if ("reference" in req.body) {
        res.status(400).json({
          message: "A referência é imutável após o cadastro.",
          fields: { reference: "A referência não pode ser alterada." },
        });
        return;
      }

      const parsed = updateSampleSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error));
        return;
      }

      try {
        const sample = await repository.findOneBy({
          id: String(req.params.id),
        });
        if (!sample) {
          res.status(404).json({ message: "Amostra não encontrada." });
          return;
        }

        const previousVoc = sample.voc;
        const values: Partial<Sample> = {
          ...parsed.data,
          voc: parsed.data.voc === undefined ? sample.voc : parsed.data.voc,
        };
        for (const field of clearableFields) {
          if (req.body[field] === "" || req.body[field] === null) {
            (values as Record<string, unknown>)[field] = null;
          }
        }

        repository.merge(sample, values);
        await repository.save(sample);
        await refreshAddressStatus(dataSource.manager, sample);
        if (previousVoc !== sample.voc) {
          await recordMovement(dataSource.manager, req.authUser!, {
            sampleId: sample.id,
            sampleReference: sample.reference,
            event: "VOC_MODIFICADO",
            details: { from: previousVoc, to: sample.voc },
          });
        }
        res.json(await sampleWithAddress(dataSource.manager, sample));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/batch/move-to-recommended",
    authorize("ADMIN", "OPERATOR"),
    async (req, res, next) => {
      const parsed = batchSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Seleção inválida." });
        return;
      }
      try {
        const results = [];
        const previewCapacity = new BatchPreviewCapacity();
        for (const id of parsed.data.ids) {
          const sample = await repository.findOneBy({ id });
          const recommendation = sample
            ? await recommendedDrawer(dataSource.manager, sample)
            : null;
          if (!sample) {
            results.push({
              id,
              success: false,
              reason: "Amostra não encontrada.",
            });
            continue;
          }
          if (!recommendation) {
            results.push({ id, success: false, reason: "Sem recomendação." });
            continue;
          }
          if (sample.drawerId === recommendation.id) {
            results.push({
              id,
              success: false,
              reason: "Já está no endereço recomendado.",
            });
            continue;
          }
          if (parsed.data.preview) {
            const success = previewCapacity.tryMove(
              sample.drawerId,
              recommendation,
            );
            results.push({
              id,
              success,
              reason: success ? null : "Gaveta lotada.",
            });
            continue;
          }
          const result = await dataSource.transaction((manager) =>
            moveSample(manager, id, recommendation.id, true, req.authUser!),
          );
          results.push({
            id,
            success: result.kind === "ok",
            reason:
              result.kind === "ok" ? null : "Não foi possível movimentar.",
          });
        }
        res.json({ preview: parsed.data.preview, results });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/batch/move",
    authorize("ADMIN", "OPERATOR"),
    async (req, res, next) => {
      const parsed = batchSchema
        .refine((value) => Boolean(value.drawerId))
        .safeParse(req.body);
      if (!parsed.success || !parsed.data.drawerId) {
        res.status(400).json({ message: "Seleção e gaveta são obrigatórias." });
        return;
      }
      try {
        const results = [];
        const destination = parsed.data.preview
          ? await dataSource.getRepository(Drawer).findOneBy({
              id: parsed.data.drawerId,
            })
          : null;
        const destinationSummary = destination
          ? await drawerSummary(dataSource.manager, destination)
          : null;
        const previewCapacity = new BatchPreviewCapacity();
        for (const id of parsed.data.ids) {
          const sample = await repository.findOneBy({ id });
          if (!sample) {
            results.push({
              id,
              success: false,
              reason: "Amostra não encontrada.",
            });
            continue;
          }
          if (sample.drawerId === parsed.data.drawerId) {
            results.push({ id, success: false, reason: "Já está no destino." });
            continue;
          }
          if (parsed.data.preview) {
            if (!destinationSummary) {
              results.push({
                id,
                success: false,
                reason: "Gaveta não encontrada.",
              });
              continue;
            }
            const success = previewCapacity.tryMove(
              sample.drawerId,
              destinationSummary,
            );
            results.push({
              id,
              success,
              reason: success ? null : "Destino sem capacidade.",
            });
            continue;
          }
          const result = await dataSource.transaction((manager) =>
            moveSample(
              manager,
              id,
              parsed.data.drawerId!,
              true,
              req.authUser!,
              "Movimentação em lote",
            ),
          );
          results.push({
            id,
            success: result.kind === "ok",
            reason:
              result.kind === "ok"
                ? null
                : result.kind === "full"
                  ? "Destino sem capacidade."
                  : result.kind === "drawer-not-found"
                    ? "Gaveta não encontrada."
                    : result.kind === "not-found"
                      ? "Amostra não encontrada."
                      : "Não foi possível movimentar.",
          });
        }
        res.json({ preview: parsed.data.preview, results });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/batch/remove-address",
    authorize("ADMIN", "OPERATOR"),
    async (req, res, next) => {
      const parsed = batchSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Seleção inválida." });
        return;
      }
      try {
        const results = [];
        for (const id of parsed.data.ids) {
          const sample = await repository.findOneBy({ id });
          if (!sample?.drawerId) {
            results.push({
              id,
              success: false,
              reason: "Amostra sem endereço.",
            });
            continue;
          }
          if (!parsed.data.preview) {
            await dataSource.transaction(async (manager) => {
              const current = await manager
                .getRepository(Sample)
                .findOneByOrFail({ id });
              const fromDrawerId = current.drawerId;
              current.drawerId = null;
              current.status = "SEM_ENDERECO";
              current.divergenceReason = null;
              await manager.save(current);
              await recordMovement(manager, req.authUser!, {
                sampleId: id,
                sampleReference: current.reference,
                event: "REMOVIDO_ENDERECO",
                fromDrawerId,
                details: { batch: true },
              });
            });
          }
          results.push({ id, success: true, reason: null });
        }
        res.json({ preview: parsed.data.preview, results });
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete("/batch", authorize("ADMIN"), async (req, res, next) => {
    const parsed = batchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Seleção inválida." });
      return;
    }
    try {
      const results = [];
      for (const id of parsed.data.ids) {
        const sample = await repository.findOneBy({ id });
        if (!sample) {
          results.push({
            id,
            success: false,
            reason: "Amostra não encontrada.",
          });
          continue;
        }
        if (!parsed.data.preview) {
          await dataSource.transaction(async (manager) => {
            await recordMovement(manager, req.authUser!, {
              sampleId: sample.id,
              sampleReference: sample.reference,
              event: "DELETADO",
              fromDrawerId: sample.drawerId,
              details: { batch: true },
            });
            await manager.getRepository(Sample).remove(sample);
          });
        }
        results.push({ id, success: true, reason: null });
      }
      res.json({ preview: parsed.data.preview, results });
    } catch (error) {
      next(error);
    }
  });

  router.post(
    "/:id/address",
    authorize("ADMIN", "OPERATOR"),
    async (req, res, next) => {
      try {
        const sample = await repository.findOneBy({
          id: String(req.params.id),
        });
        if (!sample) {
          res.status(404).json({ message: "Amostra não encontrada." });
          return;
        }
        const recommendation = await recommendedDrawer(
          dataSource.manager,
          sample,
        );
        if (!recommendation) {
          res.status(422).json({
            message: "A referência e o VOC não geram uma recomendação.",
          });
          return;
        }
        const result = await dataSource.transaction((manager) =>
          moveSample(
            manager,
            sample.id,
            recommendation.id,
            true,
            req.authUser!,
          ),
        );
        if (result.kind === "full") {
          res
            .status(409)
            .json({ message: "A gaveta recomendada está lotada." });
          return;
        }
        if (result.kind !== "ok") {
          res
            .status(404)
            .json({ message: "Amostra ou gaveta não encontrada." });
          return;
        }
        res.json(result.sample);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/move",
    authorize("ADMIN", "OPERATOR"),
    async (req, res, next) => {
      const parsed = moveSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error));
        return;
      }
      try {
        const result = await dataSource.transaction((manager) =>
          moveSample(
            manager,
            String(req.params.id),
            parsed.data.drawerId,
            parsed.data.confirmDivergence,
            req.authUser!,
            parsed.data.reason,
          ),
        );
        if (result.kind === "divergent-unconfirmed") {
          res.status(400).json({
            message:
              "É necessário confirmar a movimentação para gaveta divergente.",
          });
          return;
        }
        if (result.kind === "full") {
          res
            .status(409)
            .json({ message: "A gaveta selecionada está lotada." });
          return;
        }
        if (result.kind !== "ok") {
          res
            .status(404)
            .json({ message: "Amostra ou gaveta não encontrada." });
          return;
        }
        res.json(result.sample);
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    "/:id/address",
    authorize("ADMIN", "OPERATOR"),
    async (req, res, next) => {
      try {
        const sample = await dataSource.transaction(async (manager) => {
          const transactionRepository = manager.getRepository(Sample);
          const current = await transactionRepository.findOne({
            where: { id: String(req.params.id) },
            lock: { mode: "pessimistic_write" },
          });
          if (!current) return null;
          const fromDrawerId = current.drawerId;
          current.drawerId = null;
          current.status = "SEM_ENDERECO";
          current.divergenceReason = null;
          await transactionRepository.save(current);
          await recordMovement(manager, req.authUser!, {
            sampleId: current.id,
            sampleReference: current.reference,
            event: "REMOVIDO_ENDERECO",
            fromDrawerId,
          });
          return current;
        });
        if (!sample) {
          res.status(404).json({ message: "Amostra não encontrada." });
          return;
        }
        res.json(await sampleWithAddress(dataSource.manager, sample));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get("/:id/movements", async (req, res, next) => {
    try {
      res.json(
        await dataSource.getRepository(SampleMovement).find({
          where: { sampleId: String(req.params.id) },
          order: { createdAt: "DESC" },
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
};
