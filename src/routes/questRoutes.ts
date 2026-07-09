// src/routes/questRoutes.ts
import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { listQuests, addQuest, removeQuest, getDailyQuests, setDailyQuests, clearDailyOverride } from "../controllers/questController";

const router = Router();
router.get("/daily", authenticate, getDailyQuests);
router.put("/daily", authenticate, authorize("admin"), setDailyQuests);
router.delete("/daily/:date", authenticate, authorize("admin"), clearDailyOverride);
router.get("/", authenticate, listQuests);
router.post("/", authenticate, authorize("admin"), addQuest);
router.delete("/:id", authenticate, authorize("admin"), removeQuest);
export default router;