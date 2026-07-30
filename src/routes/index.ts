// Master router. Everything is mounted under /api (see app.use("/api", ...) in
// src/index.ts) so the full paths are /api/auth/login, /api/challenge/all, etc.
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
import customActivityRoutes from "./customActivityRoutes";
import leaderboardRoutes from "./leaderboardRoutes";
import checkinRoutes from "./checkinRoutes";
import pushRoutes from "./pushRoutes";

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
router.use("/custom-activity", customActivityRoutes);
router.use("/leaderboard", leaderboardRoutes);
router.use("/checkin", checkinRoutes);
router.use("/push", pushRoutes);

export default router;