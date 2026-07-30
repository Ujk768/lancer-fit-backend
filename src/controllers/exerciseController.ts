// src/controllers/exerciseController.ts
//
// Logging a workout from the app. Creates an ExerciseSession, awards points
// (rule: 1 minute = 1 point for time-based; quantity * pointsPerUnit for
// catalog activities), bumps the user's totalXp, and emits a realtime event.
//
// Rules enforced here:
//  - performedAt may only be TODAY or YESTERDAY (users can back-fill one day if
//    they forgot, but no further). Future dates are rejected.
//  - if the activity isn't a catalog one (no activityId), we remember it as a
//    per-user CustomActivity so it persists and can be pinned/reused.

import { Request, Response } from "express";
import { sequelize } from "../config/database";
import { ExerciseSession } from "../models/ExerciseSession";
import { Activity } from "../models/Activity";
import { User } from "../models/User";
import { asyncHandler } from "../utils/asyncHandler";
import { serializeSession } from "../utils/serializers";
import { emit } from "../realtime/io";
import { ensureCustom } from "./customActivityController";
import { evaluateExerciseBadges } from "../services/badges/exerciseBadges";

const slugify = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Returns { when, error? }. Allowed window: today or yesterday only, no future.
function validatePerformedAt(performedAt?: string): { when: Date; error?: string } {
  const when = performedAt ? new Date(performedAt) : new Date();
  if (Number.isNaN(when.getTime())) return { when: new Date(), error: "Invalid date." };

  const now = new Date();
  if (when.getTime() > now.getTime() + 60_000) {
    return { when, error: "You can't log an activity in the future." };
  }
  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const whenDay = startOfDay(when);
  if (whenDay.getTime() < yesterday.getTime()) {
    return { when, error: "You can only log activities from today or yesterday." };
  }
  return { when };
}

// POST /api/exercise/log
export const logExercise = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const {
    exerciseKey,
    exerciseName,
    areaKey = null,
    activityId = null,
    quantity = 0,
    unit = "min",
    durationMin = 0,
    performedAt,
    isCustom = false,
  } = req.body;

  if (!exerciseKey || !exerciseName) {
    return res.status(400).json({ success: false, message: "exerciseKey and exerciseName are required" });
  }
  if (durationMin <= 0 && quantity <= 0) {
    return res.status(400).json({ success: false, message: "Provide durationMin or quantity greater than 0" });
  }

  const { when, error } = validatePerformedAt(performedAt);
  if (error) return res.status(400).json({ success: false, message: error });

  const t = await sequelize.transaction();
  try {
    let points = Math.round(durationMin); // default: 1 min = 1 point
    if (activityId) {
      const activity = await Activity.findByPk(activityId, { transaction: t });
      if (activity && quantity > 0) points = Math.round(quantity * activity.pointsPerUnit);
    }

    const session = await ExerciseSession.create(
      { userId, activityId, exerciseKey, exerciseName, areaKey, quantity, unit, durationMin, points, performedAt: when },
      { transaction: t },
    );

    await User.increment({ totalXp: points }, { where: { userId }, transaction: t });

    // Award any badge earned by logging this specific exercise (bridge from the
    // ExerciseSession path into the badge system).
    await evaluateExerciseBadges(userId, session, t);

    await t.commit();

    // Only remember GENUINE custom activities (ones the user created under
    // "Other"). Catalog activities advertised by the university are not saved to
    // the user's custom list — they're always available in the catalog already.
    if (isCustom === true) {
      try { await ensureCustom(userId, exerciseName, slugify(exerciseName)); } catch { /* non-fatal */ }
    }

    const payload = serializeSession(session);
    emit.toUser(userId, "exercise:logged", payload);
    emit.toAllAdmins("exercise:logged", { userId, ...payload });

    res.status(201).json({ success: true, session: payload, pointsEarned: points });
  } catch (err) {
    await t.rollback();
    throw err;
  }
});

// GET /api/exercise/history?limit=50
export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const sessions = await ExerciseSession.findAll({
    where: { userId }, order: [["performedAt", "DESC"]], limit,
  });
  res.status(200).json({ success: true, sessions: sessions.map(serializeSession) });
});