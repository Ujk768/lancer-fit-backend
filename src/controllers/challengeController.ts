import { Request, Response, NextFunction } from 'express';
import { TLCChallengeParticipant } from '../models/Participant';
import { TLCChallenge, PersonalChallenge } from '../models/Challenge';
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

    res.status(201).json({ success: true, message: 'Personal challenge created', challenge });
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
      where: { challengeId, userId },
    });

    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found or unauthorized' });
    }

    if (challenge.status === 'completed') {
      return res.status(400).json({ message: 'Challenge already completed' });
    }

    await challenge.update({ status: 'completed', points: points || 0 });

    res.status(200).json({ success: true, message: 'Challenge marked as completed', challenge });
  } catch (err) {
    next(err);
  }
};

// ── POST /challenges/personal/:challengeId/claim-points ──────────
// This fills your empty placeholder function cleanly!
export const addPersonalChallengePoints = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user!;
    const { challengeId } = req.params;
    const { pointsToAdd } = req.body; // Expecting increment value e.g., { "pointsToAdd": 15 }

    if (!pointsToAdd || pointsToAdd <= 0) {
      return res.status(400).json({ message: 'Please provide valid positive points to add.' });
    }

    const challenge = await PersonalChallenge.findOne({
      where: { challengeId, userId }
    });

    if (!challenge) {
      return res.status(404).json({ message: 'Personal challenge not found' });
    }

    // Increment points safely on the instance
    const updatedPoints = challenge.points + Number(pointsToAdd);
    await challenge.update({ points: updatedPoints });

    res.status(200).json({
      success: true,
      message: `${pointsToAdd} points added successfully!`,
      currentTotal: updatedPoints
    });
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
      return res.status(404).json({ message: 'TLC Challenge not found' });
    }

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

    res.status(201).json({ success: true, message: 'Registered for challenge', participant });
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
        attributes: ['userId', 'name', 'profileImage'],
      }],
      order: [['points', 'DESC']],
    });

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

// ── GET /challenges/tlc/:challengeId/participants ────────────────
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

// ── PATCH /admin/challenges/tlc/:challengeId/points ──────────────
// NOTE: Shift this route target over to your admin router for proper file hygiene!
export const awardTLCPoints = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { challengeId } = req.params;
    const { userId: targetUserId, points } = req.body;

    const participant = await TLCChallengeParticipant.findOne({
      where: { userId: targetUserId, challengeId },
    });

    if (!participant) {
      return res.status(404).json({ message: 'Participant not found in this challenge' });
    }

    await participant.update({ points });

    res.status(200).json({ success: true, message: 'Points awarded successfully', participant });
  } catch (err) {
    next(err);
  }
};