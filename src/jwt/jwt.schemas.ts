import { z } from "zod";

export const jwtTokenSchema = z
  .string()
  .trim()
  .min(1, "Token obrigatório.")
  .max(4096, "Token inválido.")
  .regex(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/, "Token inválido.");
