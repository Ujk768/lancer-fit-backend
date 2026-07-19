// src/controllers/questController.ts
import { Request, Response } from "express";
import { Quest } from "../models/Quest";
import { DailyQuestOverride } from "../models/DailyQuestOverride";
import { asyncHandler } from "../utils/asyncHandler";
import { serializeQuest } from "../utils/serializers";
import { emit } from "../realtime/io";
import { resolveDailyQuests } from "../services/dailyQuests";

const DAILY_QUEST_COUNT = 3;

export const listQuests = asyncHandler(async (_req: Request, res: Response) => {
  const quests = await Quest.findAll({ order: [["createdAt", "ASC"]] });
  res.status(200).json({ success: true, quests: quests.map(serializeQuest) });
});

export const addQuest = asyncHandler(async (req: Request, res: Response) => {
  const { title, xp, category } = req.body;
  if (!title?.trim()) return res.status(400).json({ message: "Quest title is required." });
  const points = Number(xp);
  if (!Number.isFinite(points) || points <= 0) {
    return res.status(400).json({ message: "Quest XP must be a positive number." });
  }
  const quest = await Quest.create({ title: title.trim(), xp: points, category: category || "Lifestyle" });
  res.status(201).json({ success: true, quest: serializeQuest(quest) });
});

export const removeQuest = asyncHandler(async (req: Request, res: Response) => {
  const total = await Quest.count();
  if (total <= DAILY_QUEST_COUNT) {
    return res.status(400).json({ message: `The bank needs at least ${DAILY_QUEST_COUNT} quests for the daily rotation.` });
  }
  const deleted = await Quest.destroy({ where: { questId: Number(req.params.id) } });
  if (!deleted) return res.status(404).json({ message: "That quest no longer exists." });
  res.status(200).json({ success: true });
});

export const getDailyQuests = asyncHandler(async (req: Request, res: Response) => {
  const dateKey = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  // Selection logic lives in services/dailyQuests so the badge system resolves
  // the exact same daily set this endpoint serves.
  const quests = await resolveDailyQuests(dateKey);
  res.status(200).json({ success: true, date: dateKey, quests: quests.map(serializeQuest) });
});

export const setDailyQuests = asyncHandler(async (req: Request, res: Response) => {
  const { date, questIds } = req.body;
  if (!date) return res.status(400).json({ message: "A date is required." });
  if (!Array.isArray(questIds) || questIds.length === 0) {
    return res.status(400).json({ message: "Select at least one quest for the day." });
  }
  if (questIds.length > 5) return res.status(400).json({ message: "A day can carry at most 5 quests." });
  await DailyQuestOverride.upsert({ dateKey: date, questIds });
  emit.toAllStudents("quests:updated", { date });
  res.status(200).json({ success: true });
});

export const clearDailyOverride = asyncHandler(async (req: Request, res: Response) => {
  await DailyQuestOverride.destroy({ where: { dateKey: req.params.date } });
  emit.toAllStudents("quests:updated", { date: req.params.date });
  res.status(200).json({ success: true });
});