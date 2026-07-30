// src/routes/leaderboardRoutes.ts
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { getFacultyLeaderboard, getCampusLeaderboard } from "../controllers/leaderboardController";

const router = Router();
router.get("/faculty", authenticate, getFacultyLeaderboard);
router.get("/campus", authenticate, getCampusLeaderboard);
export default router;