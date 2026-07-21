// src/routes/questRoutes.ts
import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { listQuests, removeQuest, getDailyQuests, setDailyQuests, clearDailyOverride, addQuest } from "../controllers/questController";

const router = Router();
router.get("/list", authenticate, listQuests);
router.get("/daily", authenticate, getDailyQuests);
router.put("/set-daily", authenticate, authorize("admin"), setDailyQuests);
router.delete("/daily/:date", authenticate, authorize("admin"), clearDailyOverride);
router.post("/add", authenticate, authorize("admin"), addQuest);
router.delete("/:id", authenticate, authorize("admin"), removeQuest);

export default router
