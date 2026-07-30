// src/routes/adminRoutes.ts
import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { adminLogin, listAdmins, createAdmin, removeAdmin } from "../controllers/adminController";

const router = Router();
router.post("/login", adminLogin);
router.get("/", authenticate, authorize("admin"), listAdmins);
router.post("/", authenticate, authorize("admin"), createAdmin);
router.delete("/:id", authenticate, authorize("admin"), removeAdmin);
export default router;