// src/controllers/statsController.ts
import { Request, Response } from "express";
import { Op, fn, col, literal } from "sequelize";
import { ExerciseSession } from "../models/ExerciseSession";
import { asyncHandler } from "../utils/asyncHandler";

type Range = "day" | "week" | "month" | "year";

interface RangeConfig {
  start: Date;
  bucketCount: number;
  labelFor: (d: Date) => string;
  bucketIndex: (d: Date, start: Date) => number;
}

function buildRange(range: Range, now = new Date()): RangeConfig {
  const start = new Date(now);
  switch (range) {
    case "day": {
      start.setHours(0, 0, 0, 0);
      return {
        start, bucketCount: 24,
        labelFor: (d) => `${d.getHours()}:00`,
        bucketIndex: (d) => d.getHours(),
      };
    }
    case "week": {
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return {
        start, bucketCount: 7,
        labelFor: (d) => d.toLocaleDateString("en-CA", { weekday: "short" }),
        bucketIndex: (d, s) => Math.floor((d.getTime() - s.getTime()) / 86400000),
      };
    }
    case "month": {
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      return {
        start, bucketCount: 30,
        labelFor: (d) => d.toLocaleDateString("en-CA", { month: "short", day: "numeric" }),
        bucketIndex: (d, s) => Math.floor((d.getTime() - s.getTime()) / 86400000),
      };
    }
    case "year":
    default: {
      start.setMonth(start.getMonth() - 11);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return {
        start, bucketCount: 12,
        labelFor: (d) => d.toLocaleDateString("en-CA", { month: "short" }),
        bucketIndex: (d, s) =>
          (d.getFullYear() - s.getFullYear()) * 12 + (d.getMonth() - s.getMonth()),
      };
    }
  }
}

function parseRange(raw: unknown): Range {
  return (["day", "week", "month", "year"] as Range[]).includes(raw as Range)
    ? (raw as Range) : "week";
}

function aggregate(sessions: ExerciseSession[], cfg: RangeConfig) {
  const buckets = Array.from({ length: cfg.bucketCount }, (_, i) => {
    const d = new Date(cfg.start);
    if (cfg.bucketCount === 24) d.setHours(i);
    else if (cfg.bucketCount === 12) d.setMonth(d.getMonth() + i);
    else d.setDate(d.getDate() + i);
    return { label: cfg.labelFor(d), totalDuration: 0, totalQuantity: 0, totalPoints: 0, sessionCount: 0 };
  });

  let totalDuration = 0, totalQuantity = 0, totalPoints = 0;
  for (const s of sessions) {
    const idx = cfg.bucketIndex(new Date(s.performedAt), cfg.start);
    if (idx < 0 || idx >= buckets.length) continue;
    const b = buckets[idx];
    b.totalDuration += s.durationMin;
    b.totalQuantity += s.quantity;
    b.totalPoints += s.points;
    b.sessionCount += 1;
    totalDuration += s.durationMin;
    totalQuantity += s.quantity;
    totalPoints += s.points;
  }

  const count = sessions.length;
  return {
    buckets,
    totals: {
      sessionCount: count, totalDuration, totalQuantity, totalPoints,
      avgDurationPerSession: count ? +(totalDuration / count).toFixed(1) : 0,
      avgQuantityPerSession: count ? +(totalQuantity / count).toFixed(1) : 0,
      avgPointsPerSession: count ? Math.round(totalPoints / count) : 0,
    },
  };
}

export const listLoggedExercises = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const rows = await ExerciseSession.findAll({
    where: { userId },
    attributes: [
      "exerciseKey",
      [fn("MAX", col("exerciseName")), "exerciseName"],
      [fn("COUNT", col("sessionId")), "sessionCount"],
      [fn("MAX", col("performedAt")), "lastPerformedAt"],
    ],
    group: ["exerciseKey"],
    order: [[literal("MAX(\"performedAt\")"), "DESC"]],
    raw: true,
  });
  res.status(200).json({ success: true, exercises: rows });
});

export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const range = parseRange(req.query.range);
  const cfg = buildRange(range);
  const sessions = await ExerciseSession.findAll({
    where: { userId, performedAt: { [Op.gte]: cfg.start } },
    order: [["performedAt", "ASC"]],
  });
  const { buckets, totals } = aggregate(sessions, cfg);
  res.status(200).json({ success: true, range, buckets, totals });
});

export const getExerciseStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { key } = req.params;
  const range = parseRange(req.query.range);
  const cfg = buildRange(range);
  const sessions = await ExerciseSession.findAll({
    where: { userId, exerciseKey: key, performedAt: { [Op.gte]: cfg.start } },
    order: [["performedAt", "ASC"]],
  });
  const { buckets, totals } = aggregate(sessions, cfg);
  const exerciseName = sessions[0]?.exerciseName ?? key;
  const unit = sessions[0]?.unit ?? "min";
  res.status(200).json({ success: true, exerciseKey: key, exerciseName, unit, range, buckets, totals });
});