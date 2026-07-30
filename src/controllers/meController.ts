// src/controllers/meController.ts
//
// GET /api/user/me — the live profile the app's Home screen reads. Everything
// here is derived on the fly so it's always correct:
//   - totalXp / level from the User row
//   - streak computed from DISTINCT days the user logged an ExerciseSession
//     (this is exactly "streak = consecutive days with a logged activity")
//   - loggedToday so the app knows whether today's activity is already done
//
// No schema change needed: the streak is a pure function of session history.

import { Request, Response } from "express";
import { User } from "../models/User";
import { ExerciseSession } from "../models/ExerciseSession";
import { asyncHandler } from "../utils/asyncHandler";

// XP curve: level N requires N*... simple, legible progression.
// Level 1 starts at 0; each level needs `base + (level-1)*step` cumulative.
function levelFromXp(totalXp: number) {
  // Level up every 2000 XP (matches the app's xpMax of 2000/2200 feel).
  const perLevel = 2000;
  const level = Math.floor(totalXp / perLevel) + 1;
  const intoLevel = totalXp - (level - 1) * perLevel;
  const xpMax = perLevel;
  return { level, xpIntoLevel: intoLevel, xpMax, xpToNext: xpMax - intoLevel };
}

// Local YYYY-MM-DD key for a date.
function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Given the set of distinct day-keys the user was active, count the current
// streak ending today (or yesterday — a streak stays "alive" through today
// until midnight even if today isn't logged yet).
function computeStreak(dayKeys: Set<string>) {
  if (dayKeys.size === 0) return { currentStreak: 0, loggedToday: false };

  const today = new Date();
  const todayKey = dayKey(today);
  const loggedToday = dayKeys.has(todayKey);

  // Start counting from today if logged, else from yesterday (grace until midnight).
  const cursor = new Date(today);
  if (!loggedToday) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  // Walk backwards day by day while each day is present.
  // Guard the loop to a sane max (e.g. 730 days).
  for (let i = 0; i < 730; i++) {
    if (dayKeys.has(dayKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return { currentStreak: streak, loggedToday };
}

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const user = await User.findByPk(userId, { attributes: { exclude: ["password"] } });
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  // Pull just the timestamps we need to derive the streak.
  const sessions = await ExerciseSession.findAll({
    where: { userId },
    attributes: ["performedAt"],
    order: [["performedAt", "DESC"]],
    limit: 800,
  });

  const dayKeys = new Set(sessions.map((s) => dayKey(new Date(s.performedAt))));
  const { currentStreak, loggedToday } = computeStreak(dayKeys);
  const progression = levelFromXp(user.totalXp || 0);

  res.status(200).json({
    success: true,
    user: {
      id: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      name: [user.firstName, user.lastName].filter(Boolean).join(" ").trim(),
      email: user.email,
      faculty: user.faculty,
      nationality: user.nationality,
      totalXp: user.totalXp || 0,
      ...progression,
      streak: currentStreak,
      loggedToday,
      totalWorkouts: dayKeys.size,
    },
  });
});