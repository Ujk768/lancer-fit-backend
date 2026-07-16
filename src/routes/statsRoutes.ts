// src/routes/statsRoutes.ts
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { listLoggedExercises, getSummary, getExerciseStats } from "../controllers/statsController";

const router = Router();
router.get("/exercises", authenticate, listLoggedExercises);
router.get("/summary", authenticate, getSummary);
router.get("/exercise/:key", authenticate, getExerciseStats);
export default router;