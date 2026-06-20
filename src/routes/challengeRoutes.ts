import { Router } from 'express';
  // Checked your filename from earlier!
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
  addPersonalChallengePoints
} from '../controllers/challengeController';

const router = Router();

// =========================================================================
// ── PERSONAL CHALLENGES ROUTING
// =========================================================================

// 1. GET /api/challenge/personal/me — Fetch all personal challenges for the logged-in user
// NOTE: Kept at top of the block so it doesn't collide with dynamic params if modified later
router.get('/personal/me', authenticate, getUserPersonalChallenges);

// 2. POST /api/challenge/personal — Create a new personal challenge
router.post('/personal', authenticate, createPersonalChallenge);

// 3. PATCH /api/challenge/personal/:challengeId/complete — Mark a personal challenge complete and set final points
router.patch('/personal/:challengeId/complete', authenticate, completePersonalChallenge);

// 4. POST /api/challenge/personal/:challengeId/points — Incrementally claim/add points to an existing personal challenge
router.post('/personal/:challengeId/points', authenticate, addPersonalChallengePoints);


// =========================================================================
// ── TLC CHALLENGES ROUTING
// =========================================================================

// 1. GET /api/challenge/tlc/me — Fetch all TLC challenges the current user is active in
// CRITICAL: Must live ABOVE any '/tlc/:challengeId' paths so "me" isn't parsed as a dynamic ID number!
router.get('/tlc/me', authenticate, getUserTLCChallenges);

// 2. POST /api/challenge/tlc/:challengeId/register — Register the current user into a TLC challenge
router.post('/tlc/:challengeId/register', authenticate, registerForTLC);

// 3. GET /api/challenge/tlc/:challengeId/leaderboard — View the ranked points leaderboard for a challenge
router.get('/tlc/:challengeId/leaderboard', authenticate, getTLCLeaderboard);

// 4. GET /api/challenge/tlc/:challengeId/participants — Admin-only view to see full rosters
router.get('/tlc/:challengeId/participants', authenticate, authorize('admin'), getTLCParticipants);

// 5. PATCH /api/challenge/tlc/:challengeId/points — Admin-only endpoint to award points to a target user
router.patch('/tlc/:challengeId/points', authenticate, authorize('admin'), awardTLCPoints);

export default router;