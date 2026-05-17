import type { RequestHandler } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import type { ZodType } from "zod";

import { AppError } from "../error/app-error.js";

export function validateParams(schema: ZodType<ParamsDictionary>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return next(new AppError(400, "VALIDATION_ERROR", "Parâmetros da requisição inválidos.", details));
    }

    req.params = result.data;
    return next();
  };
}
