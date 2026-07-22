// src/controllers/questController.ts
import { NextFunction, Request, Response } from "express";
import { Quest } from "../models/Quest";
import { DailyQuestOverride } from "../models/DailyQuestOverride";
import { asyncHandler } from "../utils/asyncHandler";
import { serializeQuest } from "../utils/serializers";
import { emit } from "../realtime/io";
import { User } from "../models/User";

const DAILY_QUEST_COUNT = 3;

export const listQuests = asyncHandler(async (_req: Request, res: Response) => {
  const quests = await Quest.findAll({ order: [["createdAt", "ASC"]] });
  res.status(200).json({ success: true, quests: quests.map(serializeQuest) });
});

export const addQuest = asyncHandler(async (req: Request, res: Response) => {
  const { title, xp, category } = req.body;
  if (!title?.trim())
    return res.status(400).json({ message: "Quest title is required." });
  const points = Number(xp);
  if (!Number.isFinite(points) || points <= 0) {
    return res
      .status(400)
      .json({ message: "Quest XP must be a positive number." });
  }
  const quest = await Quest.create({
    title: title.trim(),
    xp: points,
    category: category || "Lifestyle",
  });
  res.status(201).json({ success: true, quest: serializeQuest(quest) });
});

export const removeQuest = asyncHandler(async (req: Request, res: Response) => {
  const total = await Quest.count();
  if (total <= DAILY_QUEST_COUNT) {
    return res.status(400).json({
      message: `The bank needs at least ${DAILY_QUEST_COUNT} quests for the daily rotation.`,
    });
  }
  const deleted = await Quest.destroy({
    where: { questId: Number(req.params.id) },
  });
  if (!deleted)
    return res.status(404).json({ message: "That quest no longer exists." });
  res.status(200).json({ success: true });
});

function pickDeterministic(bank: Quest[], dateKey: string): Quest[] {
  if (bank.length === 0) return [];
  let seed = 0;
  for (const ch of dateKey) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const pool = [...bank];
  const picked: Quest[] = [];
  const count = Math.min(DAILY_QUEST_COUNT, pool.length);
  for (let i = 0; i < count; i++) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const idx = seed % pool.length;
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

export const getDailyQuests = asyncHandler(
  async (req: Request, res: Response) => {
    const dateKey =
      (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const bank = await Quest.findAll();
    const override = await DailyQuestOverride.findOne({ where: { dateKey } });
    let quests: Quest[];

    if (override) {
      const byId = new Map(bank.map((q) => [q.questId, q]));
      quests = override.questIds
        .map((id) => byId.get(Number(id)))
        .filter(Boolean) as Quest[];

      if (quests.length === 0) {
        quests = pickDeterministic(bank, dateKey);
      }
    } else {
      quests = pickDeterministic(bank, dateKey);
    }

    res.status(200).json({
      success: true,
      date: dateKey,
      quests: quests.map(serializeQuest),
    });
  },
);

export const setDailyQuests = asyncHandler(
  async (req: Request, res: Response) => {
    const { date, questIds } = req.body;
    if (!date) return res.status(400).json({ message: "A date is required." });
    if (!Array.isArray(questIds) || questIds.length === 0) {
      return res
        .status(400)
        .json({ message: "Select at least one quest for the day." });
    }
    if (questIds.length > 5)
      return res
        .status(400)
        .json({ message: "A day can carry at most 5 quests." });

    const normalizedIds = questIds.map((id) => Number(id));
    if (normalizedIds.some((id) => !Number.isInteger(id))) {
      return res
        .status(400)
        .json({ message: "Quest ids must be valid numbers." });
    }

    await DailyQuestOverride.upsert({ dateKey: date, questIds: normalizedIds });
    emit.toAllStudents("quests:updated", { date });
    res.status(200).json({ success: true });
  },
);

export const clearDailyOverride = asyncHandler(
  async (req: Request, res: Response) => {
    await DailyQuestOverride.destroy({ where: { dateKey: req.params.date } });
    emit.toAllStudents("quests:updated", { date: req.params.date });
    res.status(200).json({ success: true });
  },
);

export const claimQuestPoints = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const quest = await Quest.findByPk(id as string);
    const userId = req.user!.userId;
    if (!quest)
      return res
        .status(400)
        .send({ success: false, message: "This Quest doesnt exist" });
    const user = await User.findByPk(userId);
    if (!user)
      return res
        .status(400)
        .send({ success: false, message: "User doesnt exist" });
    await user.update({
      totalXp: (user.totalXp ?? 0) + quest.xp,
    });
    emit.toAllStudents("quests:pointsgranted", { date: req.params.date });
    return res
      .status(200)
      .send({ success: true, message: "User granted points", user });
  } catch (err) {
    next(err);
  }
};
