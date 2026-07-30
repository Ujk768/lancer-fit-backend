// src/routes/checkinRoutes.ts
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { checkIn, checkInStatus } from "../controllers/checkinController";

const router = Router();
router.post("/", authenticate, checkIn);
router.get("/status", authenticate, checkInStatus);
export default router;