import { Router } from "express";
import { getAllQuests, getRandomQuests, editQuest, deleteQuest,addQuest } from "../controllers/questContoller";


const router =Router()

router.get("/all",getAllQuests)
router.get("/random",getRandomQuests)
router.post("/add",addQuest)
router.post("/edit",editQuest)
router.delete("/delete",deleteQuest)


export default router