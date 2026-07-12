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

// challnege routes for users/students
router.get("/me", authenticate, getUserChallenges);

router.post("/:challengeId/register", authenticate, registerForChallenge);

router.get("/:challengeId/leaderboard", authenticate, getChallengeLeaderboard);

router.post("/category",authenticate,getChallengesByCategory);

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

router.post("/:challengeId/submit-points",authenticate,submitChallengePoints)

router.get("/pending",authenticate,getPendingChallenges)

router.get("/:challengeId",authenticate,getChallengeById)

export default router;
