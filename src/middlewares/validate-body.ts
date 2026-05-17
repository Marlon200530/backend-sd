import type { RequestHandler } from "express";
import type { ZodType } from "zod";

import { AppError } from "../error/app-error.js";

export function validateBody(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return next(new AppError(400, "VALIDATION_ERROR", "Dados da requisição inválidos.", details));
    }

    req.body = result.data;
    return next();
  };
}
