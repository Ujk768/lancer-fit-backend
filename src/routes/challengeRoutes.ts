// src/routes/challengeRoutes.ts
import { Router } from "express";
import { authenticate,authorize } from "../middleware/auth";
import {
  getUserChallenges,
  getChallengeLeaderboard,
  getChallengeParticipants,
  getActiveChallenges,
  getAllChallenges,
  registerForChallenge,
  createChallenge,
  submitChallengePoints,
  getChallengesByCategory,
  getPendingChallenges,
  getChallengeById
} from "../controllers/challengeController";

const router = Router();
router.get("/me", authenticate, getUserChallenges);

router.get("/active", getActiveChallenges);

router.get("/all", getAllChallenges);

router.post("/add", authenticate, authorize("admin"),createChallenge);

router.post("/category", authenticate, getChallengesByCategory);

router.get("/:challengeId",authenticate,getChallengeById)

router.post("/:challengeId/register", authenticate, registerForChallenge);

router.get("/:challengeId/leaderboard", authenticate, getChallengeLeaderboard);

router.get("/:challengeId/participants", authenticate, authorize("admin"), getChallengeParticipants);

router.post("/:challengeId/submit-points",authenticate,submitChallengePoints)

router.get("/pending",authenticate,getPendingChallenges)

// router.delete("/:challengeId", authenticate, authorize("admin"), deleteChallenge);

export default router;
