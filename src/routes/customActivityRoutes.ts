// src/routes/customActivityRoutes.ts
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { listCustom, createCustom, setPinned, deleteCustom } from "../controllers/customActivityController";

const router = Router();
router.get("/", authenticate, listCustom);
router.post("/", authenticate, createCustom);
router.patch("/:id/pin", authenticate, setPinned);
router.delete("/:id", authenticate, deleteCustom);
export default router;