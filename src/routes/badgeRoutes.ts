import { Router } from "express";
import { createBadge, getAllBadges } from "../controllers/badgeController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.get("/all",getAllBadges)
router.post("/add", authenticate, authorize("admin"), createBadge);
export default router;