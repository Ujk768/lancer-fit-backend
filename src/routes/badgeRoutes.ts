import { Router } from "express";
import { createBadge, deleteBadge, getAllBadges, getMyBadges } from "../controllers/badgeController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.get("/all", getAllBadges);
router.get("/me", authenticate, getMyBadges);
router.post("/add", authenticate, authorize("admin"), createBadge);
router.delete("/:badgeId", authenticate, authorize("admin"), deleteBadge);
export default router;