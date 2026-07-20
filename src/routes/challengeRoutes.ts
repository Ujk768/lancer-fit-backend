// src/routes/challengeRoutes.ts
import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import {
  getUserChallenges, getChallengeLeaderboard, getChallengeParticipants,
  getActiveChallenges, getAllChallenges, registerForChallenge,
  createChallenge, deleteChallenge, submitChallengePoints, getChallengesByCategory,
  getPendingChallenges, getChallengeById,
} from "../controllers/challengeController";

const router = Router();

// Static / specific paths FIRST so they aren't captured by "/:challengeId".
router.get("/me", authenticate, getUserChallenges);
router.get("/active", getActiveChallenges);
router.get("/all", getAllChallenges);
router.get("/pending", authenticate, authorize("admin"), getPendingChallenges);
router.post("/category", authenticate, getChallengesByCategory);
router.post("/add", authenticate, authorize("admin"), createChallenge);

// Parameterized paths.
router.post("/:challengeId/register", authenticate, registerForChallenge);
router.get("/:challengeId/leaderboard", authenticate, getChallengeLeaderboard);
router.post("/:challengeId/submit-points", authenticate, submitChallengePoints);
router.get("/:challengeId/participants", authenticate, authorize("admin"), getChallengeParticipants);
router.delete("/:challengeId", authenticate, authorize("admin"), deleteChallenge);

// Keep the bare "/:challengeId" GET LAST so it only matches when nothing else did.
router.get("/:challengeId", authenticate, getChallengeById);

export default router;