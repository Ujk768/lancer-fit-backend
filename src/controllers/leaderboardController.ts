// src/controllers/leaderboardController.ts
//
// Live leaderboards for the app's Ranks tab.
//
//   GET /api/leaderboard/faculty  — faculties ranked by AVERAGE XP per member
//     (total faculty XP ÷ number of members), so a big faculty doesn't win just
//     by headcount. Returns the faculty theme key so the app can color each row.
//
//   GET /api/leaderboard/campus   — individual students across the whole campus
//     ranked by their own totalXp.
//
// Both are derived live from the users table — fully dynamic.

import { Request, Response } from "express";
import { fn, col, literal } from "sequelize";
import { User } from "../models/User";
import { asyncHandler } from "../utils/asyncHandler";

// Faculty display value -> stable theme key (faculty1..9), mirroring the app.
const FACULTY_KEY_BY_VALUE: Record<string, string> = {
  "Faculty of Arts, Humanities and Social Sciences": "faculty1",
  "Faculty of Education": "faculty2",
  "Faculty of Engineering": "faculty3",
  "Faculty of Graduate Studies": "faculty4",
  "Faculty of Human Kinetics": "faculty5",
  "Faculty of Law": "faculty6",
  "Faculty of Nursing": "faculty7",
  "Odette School of Business": "faculty8",
  "Faculty of Science": "faculty9",
};

// GET /api/leaderboard/faculty
export const getFacultyLeaderboard = asyncHandler(async (_req: Request, res: Response) => {
  // Aggregate per faculty: member count + total XP -> average.
  const rows = (await User.findAll({
    attributes: [
      "faculty",
      [fn("COUNT", col("userId")), "members"],
      [fn("COALESCE", fn("SUM", col("totalXp")), 0), "totalXp"],
      [fn("COALESCE", fn("AVG", col("totalXp")), 0), "avgXp"],
    ],
    where: literal("faculty IS NOT NULL AND faculty <> ''"),
    group: ["faculty"],
    raw: true,
  })) as unknown as Array<{ faculty: string; members: string; totalXp: string; avgXp: string }>;

  const board = rows
    .map((r) => ({
      faculty: r.faculty,
      facultyKey: FACULTY_KEY_BY_VALUE[r.faculty] || null,
      members: Number(r.members),
      totalXp: Math.round(Number(r.totalXp)),
      avgXp: Math.round(Number(r.avgXp)),
    }))
    // Rank by AVERAGE xp per member, descending.
    .sort((a, b) => b.avgXp - a.avgXp)
    .map((r, i) => ({ rank: i + 1, ...r }));

  res.status(200).json({ success: true, leaderboard: board });
});

// GET /api/leaderboard/campus?limit=50
export const getCampusLeaderboard = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const users = await User.findAll({
    attributes: ["userId", "firstName", "lastName", "faculty", "nationality", "totalXp"],
    order: [["totalXp", "DESC"]],
    limit,
  });

  const board = users.map((u, i) => ({
    rank: i + 1,
    userId: u.userId,
    name: [u.firstName, u.lastName].filter(Boolean).join(" ").trim(),
    faculty: u.faculty,
    facultyKey: FACULTY_KEY_BY_VALUE[u.faculty] || null,
    nationality: u.nationality,
    xp: u.totalXp || 0,
    // Real Lancer level (2000 XP/level) so the client renders the correct
    // evolving avatar tier instead of always showing the Squire (tier 1).
    level: Math.floor((u.totalXp || 0) / 2000) + 1,
  }));

  res.status(200).json({ success: true, leaderboard: board });
});