// src/controllers/approveController.ts
import { Request, Response } from "express";
import { ChallengeParticipant } from "../models/ChallengeParticipant";
import { User } from "../models/User";
import { Challenge } from "../models/Challenge";
import { sequelize } from "../config/database";
import { asyncHandler } from "../utils/asyncHandler";
import { serializeUser, serializeChallenge } from "../utils/serializers";
import { emit } from "../realtime/io";

export const getPendingApprovals = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await ChallengeParticipant.findAll({
    where: { status: "pending" },
    include: [{ model: User, as: "user" }, { model: Challenge, as: "challenge" }],
    order: [["submitted_at", "ASC"]],
  });
  const pending = rows
    .filter((p) => p.submitted_at && p.pointsSubmitted > 0)
    .map((p) => ({
      participantId: p.participantId, claimed: p.pointsSubmitted, submittedAt: p.submitted_at,
      student: serializeUser(p.get("user") as User),
      challenge: serializeChallenge(p.get("challenge") as Challenge),
    }));
  res.status(200).json({ success: true, pending });
});

export const approveParticipant = asyncHandler(async (req: Request, res: Response) => {
  const { participantId } = req.params;
  const t = await sequelize.transaction();
  try {
    const participant = await ChallengeParticipant.findByPk(String(participantId), { transaction: t, lock: t.LOCK.UPDATE });
    if (!participant) { await t.rollback(); return res.status(404).json({ success: false, message: "Participant not found" }); }
    if (participant.status !== "pending") { await t.rollback(); return res.status(400).json({ success: false, message: `Already ${participant.status}` }); }
    if (!participant.submitted_at || participant.pointsSubmitted <= 0) { await t.rollback(); return res.status(400).json({ success: false, message: "This participant has not submitted points yet" }); }
    const challenge = await Challenge.findByPk(participant.challengeId, { transaction: t });
    if (!challenge || challenge.pointsPerUnit == null) { await t.rollback(); return res.status(400).json({ success: false, message: "Challenge has no pointsPerUnit configured" }); }
    const pointsToAward = challenge.pointsPerUnit * participant.pointsSubmitted;
    participant.status = "approved";
    participant.pointsAwarded = pointsToAward;
    participant.reviewed_at = new Date();
    participant.reviewed_by = req.user!.name;
    await participant.save({ transaction: t });
    await User.increment({ totalXp: pointsToAward }, { where: { userId: participant.userId }, transaction: t });
    await t.commit();
    emit.toUser(participant.userId, "validation:decided", {
      participantId: participant.participantId, challengeId: participant.challengeId,
      status: "approved", pointsAwarded: pointsToAward,
    });
    emit.toAllAdmins("validation:resolved", { participantId: participant.participantId });
    res.status(200).json({ success: true, message: "Participant approved and points awarded", participant });
  } catch (err) { await t.rollback(); throw err; }
});

export const rejectParticipant = asyncHandler(async (req: Request, res: Response) => {
  const { participantId } = req.params;
  const { reason } = req.body;
  const participant = await ChallengeParticipant.findByPk(String(participantId));
  if (!participant) return res.status(404).json({ success: false, message: "Participant not found" });
  if (participant.status !== "pending") return res.status(400).json({ success: false, message: `Already ${participant.status}` });
  participant.status = "rejected";
  participant.reviewed_at = new Date();
  participant.reviewed_by = req.user!.name;
  await participant.save();
  emit.toUser(participant.userId, "validation:decided", {
    participantId: participant.participantId, challengeId: participant.challengeId,
    status: "rejected", reason: reason ?? null,
  });
  emit.toAllAdmins("validation:resolved", { participantId: participant.participantId });
  res.status(200).json({ success: true, message: "Participant rejected", participant });
});