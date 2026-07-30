import {Router} from "express";
import { awardActivityPoints, createActivity, getAllActivities, getActivityBadgeTemplate } from "../controllers/activityController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.get("/badge-template",authenticate,getActivityBadgeTemplate)
router.post("/create",authenticate,createActivity)
router.get("/all",authenticate,getAllActivities)
router.post("/:activityid/award-points",authenticate,awardActivityPoints)


export default router;