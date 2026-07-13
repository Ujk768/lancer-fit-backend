import {Router} from "express";
import { awardActivityPoints, createActivity, getAllActivities } from "../controllers/activityController";
import { authenticate } from "../middleware/auth";

const router = Router();
console.log("DEBUG:", { authenticate, createActivity, getAllActivities, awardActivityPoints });


router.post("/create",authenticate,createActivity)
router.get("/all",authenticate,getAllActivities)
router.post("/:activityid/award-points",authenticate,awardActivityPoints)


export default router;