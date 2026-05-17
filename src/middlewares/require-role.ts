import type { RequestHandler } from "express";

import type { PublicUser } from "../utils/public-user.js";
import { AppError } from "../error/app-error.js";

type UserRole = PublicUser["role"];

export function requireRole(role: UserRole): RequestHandler;
export function requireRole(roles: UserRole[]): RequestHandler;
export function requireRole(roles: UserRole | UserRole[]): RequestHandler {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req, _res, next) => {
    const userRole = req.user?.role;

    if (!userRole) {
      return next(
        new AppError(401, "AUTH_TOKEN_INVALID", "Utilizador autenticado não encontrado."),
      );
    }

    if (!allowedRoles.includes(userRole)) {
      return next(
        new AppError(403, "AUTH_FORBIDDEN", "Sem permissão para executar esta acção."),
      );
    }

    return next();
  };
}
