// src/controllers/challengeController.ts
import { Request, Response, NextFunction } from 'express';
import { TLCChallengeParticipant } from '../models/Participant';
import { TLCChallenge } from '../models/Challenge';
import { PersonalChallenge } from '../models/Challenge';
import { User } from '../models/User';

// ── POST /challenges/personal ────────────────────────────────────
export const createPersonalChallenge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user!;
    const { challengeName, challengeDescription, startDate, endDate } = req.body;

    const challenge = await PersonalChallenge.create({
      userId,
      challengeName,
      challengeDescription,
      startDate,
      endDate,
      status: 'active',
      points: 0,
    });

    res.status(201).json({ message: 'Personal challenge created', challenge });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /challenges/personal/:challengeId/complete ─────────────
export const completePersonalChallenge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user!;
    const { challengeId } = req.params;
    const { points } = req.body;

    const challenge = await PersonalChallenge.findOne({
      where: { challengeId, userId },  // userId check ensures user owns this challenge
    });

    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    if (challenge.status === 'completed') {
      return res.status(400).json({ message: 'Challenge already completed' });
    }

    await challenge.update({ status: 'completed', points });

    res.status(200).json({ message: 'Challenge completed', challenge });
  } catch (err) {
    next(err);
  }
};

// ── GET /challenges/personal/me ──────────────────────────────────
export const getUserPersonalChallenges = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user!;

    const challenges = await PersonalChallenge.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });

    const total = challenges.reduce((sum, c) => sum + c.points, 0);

    res.status(200).json({
      challenges,
      totalPoints: total,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /challenges/tlc/:challengeId/register ───────────────────
export const registerForTLC = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user!;
    const { challengeId } = req.params;

    const challenge = await TLCChallenge.findByPk(challengeId as string);
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    // Check if already registered — unique constraint would catch this
    // but better to give a clear message
    const existing = await TLCChallengeParticipant.findOne({
      where: { userId, challengeId },
    });
    if (existing) {
      return res.status(409).json({ message: 'Already registered for this challenge' });
    }

    const participant = await TLCChallengeParticipant.create({
      userId,
      challengeId,
      points: 0,
    });

    res.status(201).json({ message: 'Registered for challenge', participant });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /challenges/tlc/:challengeId/points (admin only) ───────
export const awardTLCPoints = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { challengeId } = req.params;
    const { userId: targetUserId, points } = req.body;
    // targetUserId = the user being awarded points (from body)
    // req.user.userId = the admin doing the awarding

    const participant = await TLCChallengeParticipant.findOne({
      where: { userId: targetUserId, challengeId },
    });

    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }

    await participant.update({ points });

    res.status(200).json({ message: 'Points awarded', participant });
  } catch (err) {
    next(err);
  }
};

// ── GET /challenges/tlc/me ───────────────────────────────────────
export const getUserTLCChallenges = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user!;

    const participations = await TLCChallengeParticipant.findAll({
      where: { userId },
      include: [{
        model: TLCChallenge,
        as: 'challenge',
        attributes: ['challengeId', 'challengeName', 'startDate', 'endDate', 'status'],
      }],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({ participations });
  } catch (err) {
    next(err);
  }
};

// ── GET /challenges/tlc/:challengeId/leaderboard ─────────────────
export const getTLCLeaderboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { challengeId } = req.params;

    const leaderboard = await TLCChallengeParticipant.findAll({
      where: { challengeId },
      include: [{
        model: User,
        as: 'user',
        attributes: ['userId', 'name', 'profileImage'],  // no password
      }],
      order: [['points', 'DESC']],  // highest points first
    });

    // Add rank numbers to the response
    const ranked = leaderboard.map((entry, index) => ({
      rank: index + 1,
      user: entry.get('user'),
      points: entry.points,
    }));

    res.status(200).json({ challengeId, leaderboard: ranked });
  } catch (err) {
    next(err);
  }
};

// GET /challenges/tlc/:challengeId/participants
export const getTLCParticipants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { challengeId } = req.params;

    const participants = await TLCChallengeParticipant.findAll({
      where: { challengeId },
      include: [{
        model: User,
        as: 'user',
        attributes: ['userId', 'name', 'email', 'profileImage'],
      }],
      order: [['createdAt', 'ASC']],
    });

    res.status(200).json({ participants });
  } catch (err) {
    next(err);
  }
};

