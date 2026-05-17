import { Router } from "express";

import { authenticateAccessToken } from "../../jwt/authenticate.js";
import { requireRole } from "../../middlewares/require-role.js";
import { validateQuery } from "../../middlewares/validate-query.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as controller from "./reports.controller.js";
import { reportRangeQuerySchema } from "./reports.schemas.js";

const router = Router();

router.use(authenticateAccessToken, requireRole("admin"));
router.get("/overview", validateQuery(reportRangeQuerySchema), asyncHandler(controller.overview));
router.get("/resources", validateQuery(reportRangeQuerySchema), asyncHandler(controller.resources));
router.get("/loans", validateQuery(reportRangeQuerySchema), asyncHandler(controller.loans));
router.get("/export", validateQuery(reportRangeQuerySchema), asyncHandler(controller.exportReport));

export default router;
