// src/routes/userRoutes.ts
import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { getAllUsers } from "../controllers/userController";

const router = Router();
router.get("/all", authenticate, authorize("admin"), getAllUsers);
export default router;