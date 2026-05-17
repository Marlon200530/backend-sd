import { Router } from "express";

import { authenticateAccessToken } from "../../jwt/authenticate.js";
import { requireRole } from "../../middlewares/require-role.js";
import { validateBody } from "../../middlewares/validate-body.js";
import { validateParams } from "../../middlewares/validate-params.js";
import {
  createCategory,
  listCategories,
  updateCategory,
} from "./categories.controller.js";
import {
  categoryParamsSchema,
  categorySchema,
  updateCategorySchema,
} from "./categories.schemas.js";

const categoryRoutes = Router();

categoryRoutes.get("/", listCategories);
categoryRoutes.post(
  "/",
  authenticateAccessToken,
  requireRole("admin"),
  validateBody(categorySchema),
  createCategory,
);
categoryRoutes.patch(
  "/:id",
  authenticateAccessToken,
  requireRole("admin"),
  validateParams(categoryParamsSchema),
  validateBody(updateCategorySchema),
  updateCategory,
);

export default categoryRoutes;
