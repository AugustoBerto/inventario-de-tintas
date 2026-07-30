import type { NextFunction, Request, Response } from "express";
import jsonwebtoken from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";

const userSchema = z.object({
  id: z.union([z.number(), z.string()]),
  usuario: z.string(),
  matricula: z.union([z.string(), z.number()]).nullish().transform((value) => value ?? undefined),
  nome: z.string(),
  setor: z.string().nullish().transform((value) => value ?? undefined),
  nivel: z.union([z.string(), z.number()]).nullish().transform((value) => value ?? undefined),
  unidade: z.string().nullish().transform((value) => value ?? undefined),
  funcao: z.string().nullish().transform((value) => value ?? undefined),
});

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.cookies.token;

  if (!token) {
    res.status(401).json({ message: "Não autenticado." });
    return;
  }

  try {
    req.authUser = userSchema.parse(jsonwebtoken.verify(token, env.jwtSecret));
    next();
  } catch {
    res.status(401).json({ message: "Sessão inválida ou expirada." });
  }
};
