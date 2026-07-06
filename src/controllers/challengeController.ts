import { Request, Response, NextFunction } from "express";
import { ChallengeParticipant } from "../models/ChallengeParticipant";
import { Challenge } from "../models/Challenge";
import { User } from "../models/User";

export const registerForChallenge = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { userId } = req.user!;
    const { challengeId  } = req.body;
    console.log("challege",challengeId)
    const challenge = await Challenge.findByPk(challengeId as string);
    if (!challenge) {
      return res.status(404).json({ message: "Challenge not found" });
    }

    const existing = await ChallengeParticipant.findOne({
      where: { userId, challengeId },
    });
    if (existing) {
      return res
        .status(409)
        .json({ message: "Already registered for this challenge" });
    }

    const participant = await ChallengeParticipant.create({
      userId,
      challengeId,
      points: 0,
    });

    res.status(201).json({
      success: true,
      message: "Registered for challenge",
      participant,
    });
  } catch (err) {
    next(err);
  }
};

export const getUserChallenges = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // req.user gets the user from the token after going through the middleware
    const { userId } = req.user!;

    const participations = await ChallengeParticipant.findAll({
      where: { userId },
      include: [
        {
          model: Challenge,
          as: "challenge",
          attributes: [
            "challengeId",
            "challengeName",
            "startDate",
            "endDate",
            "status",
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({ participations });
  } catch (err) {
    next(err);
  }
};

export const getChallengeLeaderboard = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { challengeId } = req.params;

    const leaderboard = await ChallengeParticipant.findAll({
      where: { challengeId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["userId", "name", "profileImage"],
        },
      ],
      order: [["points", "DESC"]],
    });

    const ranked = leaderboard.map((entry, index) => ({
      rank: index + 1,
      user: entry.get("user"),
      points: entry.pointsAwarded,
    }));

    res.status(200).json({ challengeId, leaderboard: ranked });
  } catch (err) {
    next(err);
  }
};

export const getChallengeParticipants = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { challengeId } = req.params;

    const participants = await ChallengeParticipant.findAll({
      where: { challengeId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["userId", "name", "email", "profileImage", "points"],
        },
      ],
      order: [["createdAt", "ASC"]],
    });

    res.status(200).json({ participants });
  } catch (err) {
    next(err);
  }
};

export const getAllChallenges = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const allChallenges = await Challenge.findAll({
      order: [["startDate", "ASC"]],
    });
    res.status(200).json({ success: true, allChallenges });
  } catch (err) {
    next(err);
  }
};

export const getActiveChallenges = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const activeChallenges = await Challenge.findAll({
      where: {
        status: "active",
      },
      order: [["startDate", "ASC"]],
    });
    res.status(200).json({ success: true, activeChallenges });
  } catch (err) {
    next(err);
  }
};

export const createChallenge = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      challengeName,
      challengeImage,
      challengeDescription,
      startDate,
      endDate,
      status,
      venue,
      instructorName,
      challengeUnit,
      pointsPerUnit,
    } = req.body;
    const challenge = await Challenge.create({
      challengeName,
      challengeImage,
      challengeDescription,
      startDate,
      endDate,
      status,
      venue,
      instructorName,
      challengeUnit,
      pointsPerUnit,
    });
    res.status(201).json({ success: true, challenge });
  } catch (err) {
    next(err);
  }
};

