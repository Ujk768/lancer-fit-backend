import { Router, Request, Response } from "express";
import { User } from "../models";
import { addPersoanlChanllengePoints, joinPersonalChallenge } from "../controllers/userController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post("/join-personal",authenticate,joinPersonalChallenge);
router.post("/add-points",authenticate,addPersoanlChanllengePoints);

export default router;
