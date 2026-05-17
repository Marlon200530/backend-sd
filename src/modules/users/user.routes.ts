import { Router } from "express";

import { authenticateAccessToken } from "../../jwt/authenticate.js";
import { requireRole } from "../../middlewares/require-role.js";
import { validateBody } from "../../middlewares/validate-body.js";
import { validateParams } from "../../middlewares/validate-params.js";
import { validateQuery } from "../../middlewares/validate-query.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { uploadProfilePhoto } from "../resources/resources.upload.js";
import { loanListQuerySchema } from "../loans/loans.schemas.js";
import { resourceListQuerySchema } from "../resources/resources.schemas.js";
import * as userController from "./user.controller.js";
import {
  changePasswordSchema,
  updateOwnProfileSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  userIdParamsSchema,
  usersListQuerySchema,
} from "./user.schemas.js";

const router = Router();

router.get("/me", authenticateAccessToken, asyncHandler(userController.me));
router.patch(
  "/me",
  authenticateAccessToken,
  validateBody(updateOwnProfileSchema),
  asyncHandler(userController.updateMe),
);
router.patch(
  "/me/password",
  authenticateAccessToken,
  validateBody(changePasswordSchema),
  asyncHandler(userController.changePassword),
);
router.patch(
  "/me/photo",
  authenticateAccessToken,
  uploadProfilePhoto,
  asyncHandler(userController.updatePhoto),
);
router.get(
  "/me/resources",
  authenticateAccessToken,
  validateQuery(resourceListQuerySchema),
  asyncHandler(userController.myResources),
);
router.get(
  "/me/loans",
  authenticateAccessToken,
  validateQuery(loanListQuerySchema),
  asyncHandler(userController.myLoans),
);
router.get(
  "/",
  authenticateAccessToken,
  requireRole("admin"),
  validateQuery(usersListQuerySchema),
  asyncHandler(userController.list),
);
router.patch(
  "/:id/status",
  authenticateAccessToken,
  requireRole("admin"),
  validateParams(userIdParamsSchema),
  validateBody(updateUserStatusSchema),
  asyncHandler(userController.updateStatus),
);
router.patch(
  "/:id/role",
  authenticateAccessToken,
  requireRole("admin"),
  validateParams(userIdParamsSchema),
  validateBody(updateUserRoleSchema),
  asyncHandler(userController.updateRole),
);

export default router;
