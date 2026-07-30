import type { NextFunction, Request, Response } from "express";
import jsonwebtoken from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";

const userSchema = z.object({
  id: z.union([z.number(), z.string()]),
  usuario: z.string(),
  matricula: z.union([z.string(), z.number()]).optional(),
  nome: z.string(),
  setor: z.string().optional(),
  nivel: z.union([z.string(), z.number()]).optional(),
  unidade: z.string().optional(),
  funcao: z.string().optional(),
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
