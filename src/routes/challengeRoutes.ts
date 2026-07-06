import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import {
  getUserChallenges,
  getChallengeLeaderboard,
  getChallengeParticipants,
  getActiveChallenges,
  getAllChallenges,
  registerForChallenge,
  createChallenge,
} from "../controllers/challengeController";

const router = Router();

// challnege routes for users/students
router.get("/me", authenticate, getUserChallenges);

router.post("/register", authenticate, registerForChallenge);

router.get("/:challengeId/leaderboard", authenticate, getChallengeLeaderboard);

// challenge routes for admin

router.get(
  "/:challengeId/participants",
  authenticate,
  authorize("admin"),
  getChallengeParticipants,
);

router.get("/active", getActiveChallenges);

router.get("/all", getAllChallenges);

router.post("/add", authenticate, authorize("admin"),createChallenge);

export default router;
