// src/routes/userRoutes.ts
import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { getAllUsers } from "../controllers/userController";
import { getMe } from "../controllers/meController";

const router = Router();
router.get("/me", authenticate, getMe);
router.get("/all", authenticate, authorize("admin"), getAllUsers);
export default router;