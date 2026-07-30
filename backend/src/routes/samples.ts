import { Router } from "express";
import type { DataSource } from "typeorm";
import { ILike, QueryFailedError } from "typeorm";
import { z } from "zod";
import { Sample } from "../database/entities/Sample.js";
import { authenticate } from "../middleware/authenticate.js";
import {
  moveSample,
  recommendedDrawer,
  refreshAddressStatus,
  sampleWithAddress,
} from "../services/addressing.js";

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null ? undefined : value;
const optionalText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());
const optionalDate = z.preprocess(
  emptyToUndefined,
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.").optional(),
);
const optionalVoc = z.preprocess(
  emptyToUndefined,
  z.enum(["SOLVENTE", "BASE_AGUA"]).optional(),
);

const sampleInputSchema = z
  .object({
    sampleDate: optionalDate,
    manufacturedAt: optionalDate,
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
  })
  .superRefine((value, context) => {
    if (
      value.manufacturedAt &&
      value.expiresAt &&
      value.expiresAt < value.manufacturedAt
    ) {
      context.addIssue({
        code: "custom",
        path: ["expiresAt"],
        message: "A validade não pode ser anterior à fabricação.",
      });
    }
  });

const createSampleSchema = sampleInputSchema.and(
  z.object({
    reference: z
      .string()
      .trim()
      .min(1, "Informe a referência.")
      .max(80)
      .transform((value) => value.toUpperCase()),
    addressRecommended: z.boolean().default(false),
  }),
);
const updateSampleSchema = sampleInputSchema.partial();
const clearableFields = [
  "sampleDate",
  "manufacturedAt",
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
  order: z.enum(["ASC", "DESC"]).default("ASC"),
});
const moveSchema = z.object({
  drawerId: z.string().uuid("Selecione uma gaveta."),
  confirmDivergence: z.boolean().default(false),
  reason: z.string().trim().max(500).optional(),
});

const validationError = (error: z.ZodError) => ({
  message: "Revise os campos informados.",
  fields: Object.fromEntries(
    error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message]),
  ),
});

const isDuplicate = (error: unknown) =>
  error instanceof QueryFailedError &&
  (error.driverError as { code?: string }).code === "23505";

export const createSamplesRouter = (dataSource: DataSource) => {
  const router = Router();
  const repository = dataSource.getRepository(Sample);

  router.use(authenticate);

  router.get("/", async (req, res, next) => {
    const parsed = listSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json(validationError(parsed.error));
      return;
    }

    try {
      const { page, limit, search, order } = parsed.data;
      const [items, total] = await repository.findAndCount({
        where: search ? { reference: ILike(`%${search}%`) } : {},
        order: { reference: order },
        skip: (page - 1) * limit,
        take: limit,
      });
      res.json({
        items: await Promise.all(
          items.map((sample) => sampleWithAddress(dataSource.manager, sample)),
        ),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const sample = await repository.findOneBy({ id: req.params.id });
      if (!sample) {
        res.status(404).json({ message: "Amostra não encontrada." });
        return;
      }
      res.json(await sampleWithAddress(dataSource.manager, sample));
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    const parsed = createSampleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(validationError(parsed.error));
      return;
    }

    try {
      const saved = await dataSource.transaction(async (manager) => {
        const { addressRecommended, ...values } = parsed.data;
        const transactionRepository = manager.getRepository(Sample);
        const sample = await transactionRepository.save(
          transactionRepository.create({
            ...values,
            status: "SEM_ENDERECO",
          }),
        );
        if (addressRecommended) {
          const recommendation = await recommendedDrawer(manager, sample);
          if (recommendation?.available) {
            const result = await moveSample(
              manager,
              sample.id,
              recommendation.id,
              true,
            );
            if (result.kind === "ok") return result.sample;
          }
        }
        return sampleWithAddress(manager, sample);
      });
      res.status(201).json(saved);
    } catch (error) {
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

  router.patch("/:id", async (req, res, next) => {
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
      const sample = await repository.findOneBy({ id: req.params.id });
      if (!sample) {
        res.status(404).json({ message: "Amostra não encontrada." });
        return;
      }

      const values: Partial<Sample> = {
        ...parsed.data,
        voc: parsed.data.voc === undefined ? sample.voc : parsed.data.voc,
      };
      for (const field of clearableFields) {
        if (req.body[field] === "" || req.body[field] === null) {
          (values as Record<string, unknown>)[field] = null;
        }
      }

      const manufacturedAt =
        values.manufacturedAt === undefined
          ? sample.manufacturedAt
          : values.manufacturedAt;
      const expiresAt =
        values.expiresAt === undefined ? sample.expiresAt : values.expiresAt;
      if (manufacturedAt && expiresAt && expiresAt < manufacturedAt) {
        res.status(400).json({
          message: "Revise os campos informados.",
          fields: {
            expiresAt: "A validade não pode ser anterior à fabricação.",
          },
        });
        return;
      }

      repository.merge(sample, values);
      await repository.save(sample);
      await refreshAddressStatus(dataSource.manager, sample);
      res.json(await sampleWithAddress(dataSource.manager, sample));
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/address", async (req, res, next) => {
    try {
      const sample = await repository.findOneBy({ id: req.params.id });
      if (!sample) {
        res.status(404).json({ message: "Amostra não encontrada." });
        return;
      }
      const recommendation = await recommendedDrawer(dataSource.manager, sample);
      if (!recommendation) {
        res.status(422).json({
          message: "A referência e o VOC não geram uma recomendação.",
        });
        return;
      }
      const result = await dataSource.transaction((manager) =>
        moveSample(manager, sample.id, recommendation.id, true),
      );
      if (result.kind === "full") {
        res.status(409).json({ message: "A gaveta recomendada está lotada." });
        return;
      }
      if (result.kind !== "ok") {
        res.status(404).json({ message: "Amostra ou gaveta não encontrada." });
        return;
      }
      res.json(result.sample);
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/move", async (req, res, next) => {
    const parsed = moveSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(validationError(parsed.error));
      return;
    }
    try {
      const result = await dataSource.transaction((manager) =>
        moveSample(
          manager,
          req.params.id,
          parsed.data.drawerId,
          parsed.data.confirmDivergence,
          parsed.data.reason,
        ),
      );
      if (result.kind === "confirmation-required") {
        res.status(409).json({
          message: "O endereço escolhido difere da recomendação.",
          requiresConfirmation: true,
          recommendation: result.recommendation,
        });
        return;
      }
      if (result.kind === "full") {
        res.status(409).json({ message: "A gaveta selecionada está lotada." });
        return;
      }
      if (result.kind !== "ok") {
        res.status(404).json({ message: "Amostra ou gaveta não encontrada." });
        return;
      }
      res.json(result.sample);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id/address", async (req, res, next) => {
    try {
      const sample = await dataSource.transaction(async (manager) => {
        const transactionRepository = manager.getRepository(Sample);
        const current = await transactionRepository.findOne({
          where: { id: req.params.id },
          lock: { mode: "pessimistic_write" },
        });
        if (!current) return null;
        current.drawerId = null;
        current.status = "SEM_ENDERECO";
        current.divergenceReason = null;
        return transactionRepository.save(current);
      });
      if (!sample) {
        res.status(404).json({ message: "Amostra não encontrada." });
        return;
      }
      res.json(await sampleWithAddress(dataSource.manager, sample));
    } catch (error) {
      next(error);
    }
  });

  return router;
};
