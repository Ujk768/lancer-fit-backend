import { Router } from 'express';
  // Checked your filename from earlier!
import { authenticate, authorize } from '../middleware/auth';
import {
  registerForTLC,
  getUserTLCChallenges,
  getTLCLeaderboard,
  awardTLCPoints,
  getTLCParticipants,
  getActiveTLCChallenges,
  getAllTLCChallenges,
} from '../controllers/challengeController';

const router = Router();

// get user tlc challenges
router.get('/me', authenticate, getUserTLCChallenges);

// register to a tlc challenge
router.post('/register', authenticate, registerForTLC);

// get leaderboard for a specific tlc challenge
router.get('/:challengeId/leaderboard', authenticate, getTLCLeaderboard);

// get participants for a specific tlc challenge
router.get('/:challengeId/participants', authenticate, authorize('admin'), getTLCParticipants);

// award points to a specific tlc challenge participant
router.patch('/:challengeId/points', authenticate, authorize('admin'), awardTLCPoints);

router.get('/active',getActiveTLCChallenges)

router.get('/all',getAllTLCChallenges)

export default router;