import { Router } from "express";

import authRoutes from "../modules/auth/auth.routes.js";
import categoryRoutes from "../modules/categories/categories.routes.js";
import loanRoutes from "../modules/loans/loans.routes.js";
import notificationRoutes from "../modules/notifications/notifications.routes.js";
import reportRoutes from "../modules/reports/reports.routes.js";
import { resourcesRoutes } from "../modules/resources/resources.routes.js";
import userRoutes from "../modules/users/user.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/categories", categoryRoutes);
router.use("/resources", resourcesRoutes);
router.use("/loans", loanRoutes);
router.use("/notifications", notificationRoutes);
router.use("/reports", reportRoutes);

export default router;
