import { Router } from "express";

import { asyncHandler } from "../../utils/async-handler.js";
import { validateBody } from "../../middlewares/validate-body.js";
import { validateParams } from "../../middlewares/validate-params.js";
import { validateQuery } from "../../middlewares/validate-query.js";
import { resourcesController } from "./resources.controller.js";
import {
  resourceCreateBodySchema,
  resourceImageIdParamsSchema,
  resourceIdParamsSchema,
  resourceImagesUploadBodySchema,
  resourceListQuerySchema,
  resourceModerationSchema,
  updateResourceSchema,
} from "./resources.schemas.js";

import { uploadResourceImages } from "./resources.upload.js";
import { authenticateAccessToken } from "../../jwt/authenticate.js";
import { requireRole } from "../../middlewares/require-role.js";

const router = Router();

router.get(
  "/",
  validateQuery(resourceListQuerySchema),
  asyncHandler(resourcesController.list),
);
router.get(
  "/:id",
  validateParams(resourceIdParamsSchema),
  asyncHandler(resourcesController.findById),
);

router.post(
  "/",
  authenticateAccessToken,
  validateBody(resourceCreateBodySchema),
  asyncHandler(resourcesController.create),
);

router.patch(
  "/:id",
  authenticateAccessToken,
  validateParams(resourceIdParamsSchema),
  validateBody(updateResourceSchema),
  asyncHandler(resourcesController.update),
);
router.delete(
  "/:id",
  authenticateAccessToken,
  validateParams(resourceIdParamsSchema),
  asyncHandler(resourcesController.remove),
);
router.patch(
  "/:id/moderation",
  authenticateAccessToken,
  requireRole("admin"),
  validateParams(resourceIdParamsSchema),
  validateBody(resourceModerationSchema),
  asyncHandler(resourcesController.moderate),
);

router.post(
  "/:id/images",
  authenticateAccessToken,
  validateParams(resourceIdParamsSchema),
  uploadResourceImages,
  validateBody(resourceImagesUploadBodySchema),
  asyncHandler(resourcesController.addImages),
);
router.delete(
  "/:id/images/:imageId",
  authenticateAccessToken,
  validateParams(resourceImageIdParamsSchema),
  asyncHandler(resourcesController.deleteImage),
);

export { router as resourcesRoutes };
