import Router from "express";
import { createActivity } from "../controllers/activityController";

const router = Router();


router.post("/create",createActivity)

export default router;