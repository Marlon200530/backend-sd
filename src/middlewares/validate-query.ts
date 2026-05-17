import type { RequestHandler } from "express";
import type { ZodType } from "zod";

import { AppError } from "../error/app-error.js";

export function validateQuery(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return next(new AppError(400, "VALIDATION_ERROR", "Query params inválidos.", details));
    }

    Object.defineProperty(req, "query", {
      value: result.data,
      configurable: true,
      enumerable: true,
    });
    return next();
  };
}
