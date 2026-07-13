// src/controllers/challengeController.ts
import { Request, Response, NextFunction } from "express";
import { ChallengeParticipant } from "../models/ChallengeParticipant";
import { Challenge } from "../models/Challenge";
import { User } from "../models/User";
import { asyncHandler } from "../utils/asyncHandler";
import { serializeChallenge, serializeUser } from "../utils/serializers";
import { emit } from "../realtime/io";

export const registerForChallenge = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { userId } = req.user!;
    const { challengeId } = req.params;
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

export const getUserChallenges = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.user!;
  const participations = await ChallengeParticipant.findAll({
    where: { userId }, include: [{ model: Challenge, as: "challenge" }],
    order: [["createdAt", "DESC"]],
  });
  const challenges = participations.map((p) => ({
    ...serializeChallenge(p.get("challenge") as Challenge),
    myStatus: p.status, myPointsSubmitted: p.pointsSubmitted, myPointsAwarded: p.pointsAwarded,
  }));
  res.status(200).json({ success: true, challenges });
});

// export const getAllChallenges = asyncHandler(async (_req: Request, res: Response) => {
//   const rows = await Challenge.findAll({ order: [["startDate", "ASC"]] });
//   res.status(200).json({ success: true, challenges: rows.map(serializeChallenge) });
// });

// export const getActiveChallenges = asyncHandler(async (_req: Request, res: Response) => {
//   const rows = await Challenge.findAll({ where: { status: "active" }, order: [["startDate", "ASC"]] });
//   res.status(200).json({ success: true, challenges: rows.map(serializeChallenge) });
// });

// export const getChallengesByCategory = asyncHandler(async (req: Request, res: Response) => {
//   const { category } = req.body;
//   const rows = await Challenge.findAll({ where: { category }, order: [["startDate", "ASC"]] });
//   res.status(200).json({ success: true, challenges: rows.map(serializeChallenge) });
// });

export const getChallengeLeaderboard = asyncHandler(async (req: Request, res: Response) => {
  const { challengeId } = req.params;
  const rows = await ChallengeParticipant.findAll({
    where: { challengeId, status: "approved" },
    include: [{ model: User, as: "user", attributes: ["userId", "firstName", "lastName"] }],
    order: [["pointsAwarded", "DESC"]],
  });
  const leaderboard = rows.map((entry, index) => ({
    rank: index + 1, user: serializeUser(entry.get("user") as User), points: entry.pointsAwarded,
  }));
  res.status(200).json({ success: true, challengeId: Number(challengeId), leaderboard });
});

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
          attributes: ["userId", "firstName","lastName", "email", "totalXp"],
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
      category,
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
      category,
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
    if (pointsSubmitted == null || +pointsSubmitted <= 0) {
      return res.status(400).json({
        success: false,
        message: "pointsSubmitted must be a positive number",
      });
    }

    const challenge = await Challenge.findByPk(challengeId as string);
    if (!challenge) {
      return res
        .status(404)
        .json({ success: false, message: "Challenge not found" });
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

export const getChallengesByCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { category } = req.body;
    const challenges = await Challenge.findAll({
      where: {
        category: category,
      },
      order: [["startDate", "ASC"]],
    });
    res.status(200).json({
      success: true,
      challenges,
    });
  } catch (err) {
    next(err);
  }
};

export const getPendingChallenges = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const pending = await Challenge.findAll({
      where: {
        status: "pending",
      },
    });
    res.status(200).json({
      success: true,
      pending,
    });
  } catch (err) {
    next(err);
  }
};

export const getChallengeById = async(req:Request,res:Response,next:NextFunction)=>{
  try{
    const {challengeId} = req.params;
    const challenge = await Challenge.findByPk(challengeId as string)
    if (!challenge) {
      return res
        .status(404)
        .json({ success: false, message: "Challenge not found" });
    }
    return res.status(200).json({
      success: true,
      challenge
    })
  }catch(err){
    next(err)
  }
}