import Router from "express";
import { awardActivityPoints, createActivity } from "../controllers/activityController";
import { authenticate } from "../middleware/auth";
import { getUserChallenges } from "../controllers/challengeController";

const router = Router();


router.post("/create",authenticate,createActivity)
router.get("/all",authenticate,getUserChallenges)
router.post("/:activityid/award-points",authenticate,awardActivityPoints)


export default router;