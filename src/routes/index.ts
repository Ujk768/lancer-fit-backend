// src/routes/index.ts
import { Router } from "express";
import authRoutes from "./authRoutes";
import adminRoutes from "./adminRoutes";
import challengeRoutes from "./challengeRoutes";
import userRoutes from "./userRoutes";
import badgeRoutes from "./badgeRoutes";
import activityRoutes from "./activityRoutes";
import questRoutes from "./questRoutes";
import approveRoutes from "./approveRoutes";
import areaRoutes from "./areaRoutes";
import statsRoutes from "./statsRoutes";
import exerciseRoutes from "./exerciseRoutes";

const router = Router();
router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/challenge", challengeRoutes);
router.use("/user", userRoutes);
router.use("/badge", badgeRoutes);
router.use("/activity", activityRoutes);
router.use("/quest", questRoutes);
router.use("/participants", approveRoutes);
router.use("/area", areaRoutes);
router.use("/stats", statsRoutes);
router.use("/exercise", exerciseRoutes);
export default router;