// src/routes/challenges.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  registerForTLC,
  getUserTLCChallenges,
  getTLCLeaderboard,
  createPersonalChallenge,
  completePersonalChallenge,
  getUserPersonalChallenges,
  awardTLCPoints,
  getTLCParticipants,
} from '../controllers/challengeController';

const router = Router();

// ── Personal Challenges ──────────────────────────────────────────
router.post('/personal', authenticate, createPersonalChallenge);
// POST /challenges/personal — create a new personal challenge

router.patch('/personal/:challengeId/complete', authenticate, completePersonalChallenge);
// PATCH /challenges/personal/:id/complete — mark done and add points

router.get('/personal/me', authenticate, getUserPersonalChallenges);
// GET /challenges/personal/me — all personal challenges for logged in user

// ── TLC Challenges ───────────────────────────────────────────────
router.post('/tlc/:challengeId/register', authenticate, registerForTLC);
// POST /challenges/tlc/:id/register — user registers for a TLC challenge

router.patch('/tlc/:challengeId/points', authenticate, authorize('admin'), awardTLCPoints);
// PATCH /challenges/tlc/:id/points — admin awards points to a user

router.get('/tlc/:challengeId/participants',  authenticate,  authorize('admin'),  getTLCParticipants);

router.get('/tlc/me', authenticate, getUserTLCChallenges);
// GET /challenges/tlc/me — all TLC challenges user is in with their points

router.get('/tlc/:challengeId/leaderboard', authenticate, getTLCLeaderboard);
// GET /challenges/tlc/:id/leaderboard — ranked list for a specific challenge

export default router;