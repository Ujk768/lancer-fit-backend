import { Request, Response, NextFunction } from 'express';
import { TLCChallengeParticipant } from '../models/Participant';
import { TLCChallenge } from '../models/Challenge';
import { User } from '../models/User';

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

export const getAllTLCChallenges = async (req: Request, res: Response, next: NextFunction) => {
  try{
    const allChallenges = await TLCChallenge.findAll({
      order: [['startDate', 'ASC']],
    });
    res.status(200).json({ success: true, allChallenges });
  }catch(err){
    next(err);
  }
}

export const getActiveTLCChallenges = async (req: Request, res: Response, next: NextFunction) => {
  try{
    const activeChallenges = await TLCChallenge.findAll({
      where: {
        status: 'active',
      },
      order: [['startDate', 'ASC']],
    });
    res.status(200).json({ success: true, activeChallenges });
  }catch(err){
    next(err);
  }
}