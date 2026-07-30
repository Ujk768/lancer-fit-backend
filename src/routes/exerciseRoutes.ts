// src/routes/exerciseRoutes.ts
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { logExercise, getHistory } from "../controllers/exerciseController";

const router = Router();
router.post("/log", authenticate, logExercise);
router.get("/history", authenticate, getHistory);
export default router;