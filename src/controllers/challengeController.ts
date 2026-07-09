// src/controllers/challengeController.ts
import { Request, Response } from "express";
import { ChallengeParticipant } from "../models/ChallengeParticipant";
import { Challenge } from "../models/Challenge";
import { User } from "../models/User";
import { asyncHandler } from "../utils/asyncHandler";
import { serializeChallenge, serializeUser } from "../utils/serializers";
import { emit } from "../realtime/io";

export const registerForChallenge = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.user!;
  const { challengeId } = req.params;
  const challenge = await Challenge.findByPk(String(challengeId));
  if (!challenge) return res.status(404).json({ message: "Challenge not found" });
  const existing = await ChallengeParticipant.findOne({ where: { userId, challengeId } });
  if (existing) return res.status(409).json({ message: "Already registered for this challenge" });
  const participant = await ChallengeParticipant.create({
    userId, challengeId, status: "pending", pointsSubmitted: 0, pointsAwarded: 0,
  });
  await challenge.increment("participantsCount");
  emit.toAllAdmins("challenge:joined", { challengeId: Number(challengeId), userId });
  res.status(201).json({ success: true, message: "Registered for challenge", participant });
});

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

export const getAllChallenges = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await Challenge.findAll({ order: [["startDate", "ASC"]] });
  res.status(200).json({ success: true, challenges: rows.map(serializeChallenge) });
});

export const getActiveChallenges = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await Challenge.findAll({ where: { status: "active" }, order: [["startDate", "ASC"]] });
  res.status(200).json({ success: true, challenges: rows.map(serializeChallenge) });
});

export const getChallengesByCategory = asyncHandler(async (req: Request, res: Response) => {
  const { category } = req.body;
  const rows = await Challenge.findAll({ where: { category }, order: [["startDate", "ASC"]] });
  res.status(200).json({ success: true, challenges: rows.map(serializeChallenge) });
});

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

export const getChallengeParticipants = asyncHandler(async (req: Request, res: Response) => {
  const { challengeId } = req.params;
  const rows = await ChallengeParticipant.findAll({
    where: { challengeId },
    include: [{ model: User, as: "user", attributes: ["userId", "firstName", "lastName", "email"] }],
    order: [["createdAt", "ASC"]],
  });
  const participants = rows.map((p) => ({
    participantId: p.participantId, status: p.status,
    pointsSubmitted: p.pointsSubmitted, pointsAwarded: p.pointsAwarded,
    submittedAt: p.submitted_at, user: serializeUser(p.get("user") as User),
  }));
  res.status(200).json({ success: true, participants });
});

export const createChallenge = asyncHandler(async (req: Request, res: Response) => {
  const b = req.body;
  const challenge = await Challenge.create({
    challengeName: b.title ?? b.challengeName,
    challengeImage: b.imageUrl ?? b.challengeImage ?? null,
    challengeDescription: b.description ?? b.challengeDescription ?? "",
    startDate: b.startDate, endDate: b.endDate, status: b.status ?? "active",
    venue: b.venue ?? null, instructorName: b.instructorName ?? null,
    challengeUnit: b.unit ?? b.challengeUnit, pointsPerUnit: b.pointsPerUnit ?? 0,
    category: b.category ?? b.type ?? null, type: b.type ?? null, goal: b.goal ?? 0,
    xpReward: b.xpReward ?? b.podium?.first ?? 0,
    podiumFirst: b.podium?.first ?? 500, podiumSecond: b.podium?.second ?? 300, podiumThird: b.podium?.third ?? 150,
    requiresValidation: !!b.requiresValidation,
    createdBy: b.createdBy ?? req.user?.name ?? "Administrator", participantsCount: 0,
  });
  const payload = serializeChallenge(challenge);
  emit.toAllStudents("challenge:created", payload);
  res.status(201).json({ success: true, challenge: payload });
});

export const deleteChallenge = asyncHandler(async (req: Request, res: Response) => {
  const deleted = await Challenge.destroy({ where: { challengeId: Number(req.params.challengeId) } });
  if (!deleted) return res.status(404).json({ message: "That challenge no longer exists." });
  emit.toAllStudents("challenge:deleted", { challengeId: Number(req.params.challengeId) });
  res.status(200).json({ success: true });
});

export const submitChallengePoints = asyncHandler(async (req: Request, res: Response) => {
  const { challengeId } = req.params;
  const { pointsSubmitted } = req.body;
  const userId = req.user!.userId;
  if (pointsSubmitted == null || +pointsSubmitted <= 0) {
    return res.status(400).json({ success: false, message: "pointsSubmitted must be a positive number" });
  }
  const challenge = await Challenge.findByPk(String(challengeId));
  if (!challenge) return res.status(404).json({ success: false, message: "Challenge not found" });
  if (challenge.status !== "active") {
    return res.status(400).json({ success: false, message: "This challenge is not currently active" });
  }
  const participant = await ChallengeParticipant.findOne({ where: { userId, challengeId } });
  if (!participant) return res.status(403).json({ success: false, message: "You are not registered for this challenge" });
  if (participant.status !== "pending") {
    return res.status(400).json({ success: false, message: `Cannot submit points — this entry has already been ${participant.status}` });
  }
  participant.pointsSubmitted = pointsSubmitted;
  participant.submitted_at = new Date();
  await participant.save();
  emit.toAllAdmins("validation:submitted", {
    participantId: participant.participantId, challengeId: Number(challengeId), userId, pointsSubmitted,
  });
  res.status(200).json({ success: true, message: "Points submitted for review", participant });
});