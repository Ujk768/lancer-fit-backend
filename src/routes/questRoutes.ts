import { Router } from "express";
import { getAllQuests, activateQuest, editQuest, deleteQuest,addQuest, getActiveQuests } from "../controllers/questContoller";
import { authenticate, authorize } from "../middleware/auth";


const router =Router()

router.get("/all",authenticate,authorize('admin'), getAllQuests)
router.post("/add",authenticate,authorize('admin'), addQuest)
router.post("/edit",authenticate,authorize('admin'), editQuest)
router.delete("/delete",authenticate,authorize('admin'), deleteQuest)
router.post("/activate", authenticate,authorize("admin"),activateQuest)
router.get("/active",authenticate,getActiveQuests)

export default router