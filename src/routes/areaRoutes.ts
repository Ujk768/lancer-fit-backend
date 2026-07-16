// src/routes/areaRoutes.ts
import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { listAreas, addArea, removeArea, addSubActivity, removeSubActivity } from "../controllers/areaController";

const router = Router();
router.get("/", authenticate, listAreas);
router.post("/", authenticate, authorize("admin"), addArea);
router.delete("/:id", authenticate, authorize("admin"), removeArea);
router.post("/:id/activity", authenticate, authorize("admin"), addSubActivity);
router.delete("/:id/activity/:subId", authenticate, authorize("admin"), removeSubActivity);
export default router;