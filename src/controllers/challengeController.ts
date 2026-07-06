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
    const { challengeId  } = req.params;
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
      where: { challengeId, status: "approved" }, // only show approved entries on the leaderboard
      include: [
        {
          model: User,
          as: "user",
          attributes: ["userId", "firstName", "lastName"],
        },
      ],
      order: [["pointsAwarded", "DESC"]],
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

export const submitChallengePoints = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { challengeId } = req.params;
    const { pointsSubmitted } = req.body;
    const userId = req.user!.userId;
    // basic input validation
    if (pointsSubmitted == null ||  +pointsSubmitted <= 0) {
      return res.status(400).json({
        success: false,
        message: "pointsSubmitted must be a positive number",
      });
    }

    const challenge = await Challenge.findByPk(challengeId as string);
    if (!challenge) {
      return res.status(404).json({ success: false, message: "Challenge not found" });
    }

    if (challenge.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "This challenge is not currently active",
      });
    }

    // optional: also enforce the challenge's date window
    // const now = new Date();
    // if (now < challenge.startDate || now > challenge.endDate) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "This challenge is not within its active date range",
    //   });
    // }

    const participant = await ChallengeParticipant.findOne({
      where: { userId, challengeId },
    });

    if (!participant) {
      return res.status(403).json({
        success: false,
        message: "You are not registered for this challenge",
      });
    }

    if (participant.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot submit points — this entry has already been ${participant.status}`,
      });
    }

    participant.pointsSubmitted = pointsSubmitted;
    participant.submitted_at = new Date();
    await participant.save();

    res.status(200).json({
      success: true,
      message: "Points submitted for review",
      participant,
    });
  } catch (err) {
    next(err);
  }
};