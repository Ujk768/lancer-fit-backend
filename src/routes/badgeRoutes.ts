import { Router } from "express";
import { createBadge, deleteBadge, getAllBadges } from "../controllers/badgeController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.get("/all",getAllBadges)
router.post("/add", authenticate, authorize("admin"), createBadge);
router.delete("/:badgeId", authenticate, authorize("admin"), deleteBadge);
export default router;