// src/routes/activityRoutes.ts
import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { getAllActivities, createActivity, awardActivityPoints } from "../controllers/activityController";

const router = Router();
router.get("/all", authenticate, getAllActivities);
router.post("/create", authenticate, authorize("admin"), createActivity);
router.post("/:activityId/award-points", authenticate, awardActivityPoints);
export default router;