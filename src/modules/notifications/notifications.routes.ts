import { Router } from "express";

import { authenticateAccessToken } from "../../jwt/authenticate.js";
import { validateParams } from "../../middlewares/validate-params.js";
import { validateQuery } from "../../middlewares/validate-query.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as controller from "./notifications.controller.js";
import {
  notificationIdParamsSchema,
  notificationsListQuerySchema,
} from "./notifications.schemas.js";

const router = Router();

router.get("/stream", asyncHandler(controller.stream));
router.use(authenticateAccessToken);
router.get("/", validateQuery(notificationsListQuerySchema), asyncHandler(controller.list));
router.patch("/read-all", asyncHandler(controller.markAllRead));
router.patch(
  "/:id/read",
  validateParams(notificationIdParamsSchema),
  asyncHandler(controller.markRead),
);

export default router;
