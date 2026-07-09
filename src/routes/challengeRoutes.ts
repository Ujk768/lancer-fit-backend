// src/routes/challengeRoutes.ts
import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import {
  getUserChallenges, getChallengeLeaderboard, getChallengeParticipants,
  getActiveChallenges, getAllChallenges, registerForChallenge,
  createChallenge, deleteChallenge, submitChallengePoints, getChallengesByCategory,
} from "../controllers/challengeController";

const router = Router();
router.get("/me", authenticate, getUserChallenges);
router.get("/active", getActiveChallenges);
router.get("/all", getAllChallenges);
router.post("/category", authenticate, getChallengesByCategory);
router.post("/add", authenticate, authorize("admin"), createChallenge);
router.post("/:challengeId/register", authenticate, registerForChallenge);
router.get("/:challengeId/leaderboard", authenticate, getChallengeLeaderboard);
router.post("/:challengeId/submit-points", authenticate, submitChallengePoints);
router.get("/:challengeId/participants", authenticate, authorize("admin"), getChallengeParticipants);
router.delete("/:challengeId", authenticate, authorize("admin"), deleteChallenge);
export default router;