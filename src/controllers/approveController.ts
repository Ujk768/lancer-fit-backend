import { Request, Response, NextFunction } from "express";
import { ChallengeParticipant } from "../models/ChallengeParticipant";
import { User } from "../models/User";
import { Challenge } from "../models/Challenge";
import { sequelize } from "../config/database";

export const getPendingApprovals = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const pending = await ChallengeParticipant.findAll({
      where: { status: "pending" },
      include: [
        { model: User, as: "user" },
        { model: Challenge, as: "challenge" },
      ],
    });
    res.status(200).json({ success: true, pending });
  } catch (err) {
    next(err);
  }
};


// PATCH /:participantId/approve — admin approves, awards points
export const approveParticipant = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { participantId } = req.body;
  const t = await sequelize.transaction();

  try {
    const participant = await ChallengeParticipant.findByPk(participantId as string, {
      include: [{ model: Challenge, as: "challenge" }],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!participant) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Participant not found" });
    }

    if (participant.status !== "pending") {
      await t.rollback();
      return res.status(400).json({ success: false, message: `Already ${participant.status}` });
    }

    const challenge = (participant as any).challenge as Challenge | undefined;

    if (!challenge || challenge.pointsPerUnit == null) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Challenge has no pointsPerUnit configured" });
    }

    const pointsToAward = challenge.pointsPerUnit * participant.pointsSubmitted;

    participant.status = "approved";
    participant.pointsAwarded = pointsToAward;
    participant.reviewed_at = new Date();
    participant.reviewed_by = req.user!.name;
    await participant.save({ transaction: t });

    await User.increment(
      { totalXp: pointsToAward },
      { where: { id: participant.userId }, transaction: t },
    );

    await t.commit();

    res.status(200).json({
      success: true,
      message: "Participant approved and points awarded",
      participant,
    });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// PATCH /:participantId/reject — admin rejects, no points
export const rejectParticipant = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { participantId } = req.body;

  try {
    const participant = await ChallengeParticipant.findByPk(participantId as string);

    if (!participant) {
      return res.status(404).json({ success: false, message: "Participant not found" });
    }

    if (participant.status !== "pending") {
      return res.status(400).json({ success: false, message: `Already ${participant.status}` });
    }

    participant.status = "rejected";
    await participant.save();

    res.status(200).json({ success: true, message: "Participant rejected", participant });
  } catch (err) {
    next(err);
  }
};