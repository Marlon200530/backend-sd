import { Router } from "express";

import { authenticateAccessToken } from "../../jwt/authenticate.js";
import { requireRole } from "../../middlewares/require-role.js";
import { validateBody } from "../../middlewares/validate-body.js";
import { validateParams } from "../../middlewares/validate-params.js";
import { validateQuery } from "../../middlewares/validate-query.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as loansController from "./loans.controller.js";
import {
  loanCancelSchema,
  loanCreateSchema,
  loanIdParamsSchema,
  loanListQuerySchema,
  loanRejectSchema,
  loanReturnSchema,
} from "./loans.schemas.js";

const router = Router();

router.use(authenticateAccessToken);
router.post("/", validateBody(loanCreateSchema), asyncHandler(loansController.create));
router.get("/", validateQuery(loanListQuerySchema), asyncHandler(loansController.list));
router.get("/:id", validateParams(loanIdParamsSchema), asyncHandler(loansController.detail));
router.patch(
  "/:id/return",
  validateParams(loanIdParamsSchema),
  validateBody(loanReturnSchema),
  asyncHandler(loansController.returnLoan),
);
router.patch(
  "/:id/return/approve",
  validateParams(loanIdParamsSchema),
  validateBody(loanReturnSchema),
  asyncHandler(loansController.confirmReturn),
);
router.patch(
  "/:id/approve",
  validateParams(loanIdParamsSchema),
  asyncHandler(loansController.approve),
);
router.patch(
  "/:id/reject",
  validateParams(loanIdParamsSchema),
  validateBody(loanRejectSchema),
  asyncHandler(loansController.reject),
);
router.patch(
  "/:id/cancel",
  requireRole("admin"),
  validateParams(loanIdParamsSchema),
  validateBody(loanCancelSchema),
  asyncHandler(loansController.cancel),
);

export default router;
