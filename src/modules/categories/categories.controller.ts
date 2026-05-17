import type { Request, Response } from "express";

import { AppError } from "../../error/app-error.js";
import { sendSuccess } from "../../utils/api-response.js";
import { asyncHandler } from "../../utils/async-handler.js";
import {
  createCategoryService,
  listCategoriesService,
  updateCategoryService,
} from "./categories.service.js";

function parseBooleanQuery(value: unknown, field: string) {
  if (value === undefined) {
    return undefined;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new AppError(400, "VALIDATION_ERROR", `Query param ${field} inválido.`);
}

export const listCategories = asyncHandler(async (req: Request, res: Response) => {
  const isActive = parseBooleanQuery(req.query.isActive, "isActive");
  const categories = await listCategoriesService(
    isActive === undefined ? {} : { isActive },
  );

  return sendSuccess(res, 200, categories);
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await createCategoryService(req.body);

  return sendSuccess(res, 201, category);
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || Array.isArray(id)) {
    throw new AppError(400, "VALIDATION_ERROR", "Id da categoria é obrigatório.");
  }

  const category = await updateCategoryService(id, req.body);

  return sendSuccess(res, 200, category);
});
