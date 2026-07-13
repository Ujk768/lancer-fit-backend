// src/routes/questRoutes.ts
import { Router } from "express";
import { getAllQuests, activateQuest, editQuest, deleteQuest,addQuest, getActiveQuests, deactivateQuest } from "../controllers/questContoller";
import { authenticate, authorize } from "../middleware/auth";
import { listQuests, removeQuest, getDailyQuests, setDailyQuests, clearDailyOverride } from "../controllers/questController";

const router = Router();
router.get("/daily", authenticate, getDailyQuests);
router.put("/daily", authenticate, authorize("admin"), setDailyQuests);
router.delete("/daily/:date", authenticate, authorize("admin"), clearDailyOverride);
router.get("/", authenticate, listQuests);
router.post("/", authenticate, authorize("admin"), addQuest);
router.delete("/:id", authenticate, authorize("admin"), removeQuest);

router.get("/all",authenticate,authorize('admin'), getAllQuests)
router.post("/add",authenticate,authorize('admin'), addQuest)
router.post("/:questId/edit",authenticate,authorize('admin'), editQuest)
router.delete("/:questId/delete",authenticate,authorize('admin'), deleteQuest)
router.post("/:questId/activate", authenticate,authorize("admin"),activateQuest)
router.post("/:questId/deactivate", authenticate,authorize("admin"),deactivateQuest)
router.get("/active",authenticate,getActiveQuests)

export default router
