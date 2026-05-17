import type { Request } from "express";

import { AppError } from "../error/app-error.js";

export function requireAuthenticatedUser(req: Request) {
  if (!req.user) {
    throw new AppError(401, "AUTH_TOKEN_INVALID", "Utilizador autenticado não encontrado.");
  }

  return req.user;
}
