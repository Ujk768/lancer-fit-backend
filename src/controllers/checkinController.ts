// src/controllers/checkinController.ts
//
// Toldo Lancer Centre check-in. When a user is at the gym (the app confirms
// proximity via location before calling this), we record a check-in for today.
// It's idempotent — only the first check-in of the day awards XP. We store it as
// an ExerciseSession with a reserved key so it also counts toward the streak.

import { Request, Response } from "express";
import { Op } from "sequelize";
import { sequelize } from "../config/database";
import { ExerciseSession } from "../models/ExerciseSession";
import { User } from "../models/User";
import { asyncHandler } from "../utils/asyncHandler";
import { emit } from "../realtime/io";

const CHECKIN_KEY = "gym-checkin";
const CHECKIN_XP = 75;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// POST /api/checkin
export const checkIn = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  // Already checked in today?
  const existing = await ExerciseSession.findOne({
    where: { userId, exerciseKey: CHECKIN_KEY, performedAt: { [Op.gte]: startOfToday() } },
  });
  if (existing) {
    return res.status(200).json({ success: true, alreadyCheckedIn: true, pointsEarned: 0 });
  }

  const t = await sequelize.transaction();
  try {
    await ExerciseSession.create(
      {
        userId,
        activityId: null,
        exerciseKey: CHECKIN_KEY,
        exerciseName: "Gym visit",
        areaKey: "checkin",
        quantity: 1,
        unit: "visit",
        durationMin: 0,
        points: CHECKIN_XP,
        performedAt: new Date(),
      },
      { transaction: t },
    );
    await User.increment({ totalXp: CHECKIN_XP }, { where: { userId }, transaction: t });
    await t.commit();

    emit.toUser(userId, "checkin:done", { pointsEarned: CHECKIN_XP });
    res.status(201).json({ success: true, alreadyCheckedIn: false, pointsEarned: CHECKIN_XP });
  } catch (err) {
    await t.rollback();
    throw err;
  }
});

// GET /api/checkin/status — has the user checked in today?
export const checkInStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const existing = await ExerciseSession.findOne({
    where: { userId, exerciseKey: CHECKIN_KEY, performedAt: { [Op.gte]: startOfToday() } },
  });
  res.status(200).json({ success: true, checkedInToday: !!existing });
});