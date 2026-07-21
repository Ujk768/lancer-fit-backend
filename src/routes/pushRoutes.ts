// src/routes/pushRoutes.ts
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { registerPushToken, unregisterPushToken } from "../controllers/pushController";

const router = Router();
router.post("/register", authenticate, registerPushToken);
router.delete("/register", authenticate, unregisterPushToken);
export default router;