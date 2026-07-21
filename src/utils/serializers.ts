// The contract layer. Every controller returns data through these functions so
// the JSON shape the frontends consume is defined in exactly ONE place (DRY).
// If a DB column is renamed, only this file changes — not every controller and
// not the frontends.

import { Challenge } from "../models/Challenge";
import { User } from "../models/User";
import { Admin } from "../models/Admin";
import { Quest } from "../models/Quest";
import { ActivityArea } from "../models/ActivityArea";
import { ActivitySubActivity } from "../models/ActivitySubActivity";
import { ExerciseSession } from "../models/ExerciseSession";
import { seasonOf } from "./season";

export function serializeChallenge(c: Challenge) {
  return {
    id: c.challengeId,
    title: c.challengeName,
    description: c.challengeDescription,
    imageUrl: c.challengeImage ?? null,
    type: c.type ?? c.category ?? null,
    category: c.category ?? null,
    goal: c.goal,
    unit: c.challengeUnit,
    pointsPerUnit: c.pointsPerUnit,
    xpReward: c.xpReward,
    podium: { first: c.podiumFirst, second: c.podiumSecond, third: c.podiumThird },
    requiresValidation: c.requiresValidation,
    venue: c.venue ?? null,
    instructorName: c.instructorName ?? null,
    startDate: c.startDate,
    endDate: c.endDate,
    status: c.status,
    season: seasonOf(c.startDate),
    participants: c.participantsCount,
    createdBy: c.createdBy ?? null,
  };
}

// Faculty display value -> stable theme key (faculty1..9), mirroring the app.
// The mobile app themes each user's avatar and accent color off this key, so
// exposing it here lets leaderboards (campus, faculty, AND per-challenge) render
// the correct faculty avatar + color for every user without extra lookups.
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

// Lancer level from total XP (2000 XP per level), mirroring meController's
// curve. The avatar art evolves by a 5-tier ladder keyed to this level, so we
// send both so any leaderboard can show the right avatar tier.
function levelFromXp(totalXp: number): number {
  return Math.floor((totalXp || 0) / 2000) + 1;
}
function avatarTierFromLevel(level: number): number {
  if (level >= 20) return 5;
  if (level >= 14) return 4;
  if (level >= 8) return 3;
  if (level >= 3) return 2;
  return 1;
}

export function serializeUser(u: User) {
  const level = levelFromXp(u.totalXp);
  return {
    id: u.userId,
    firstName: u.firstName,
    lastName: u.lastName,
    name: [u.firstName, u.lastName].filter(Boolean).join(" ").trim(),
    email: u.email,
    role: u.role,
    faculty: u.faculty,
    // Stable theme key + avatar tier so any leaderboard renders the real
    // faculty avatar, color, and flag for this user (not a hardcoded default).
    facultyKey: FACULTY_KEY_BY_VALUE[u.faculty] || "faculty9",
    nationality: u.nationality,
    totalXp: u.totalXp,
    level,
    avatarTier: avatarTierFromLevel(level),
  };
}

export function serializeAdmin(a: Admin) {
  return {
    id: a.adminId,
    name: a.name,
    email: a.email,
    role: a.role,
    createdAt: a.createdAt,
  };
}

export function serializeQuest(q: Quest) {
  return { id: q.questId, title: q.title, xp: q.xp, category: q.category };
}

export function serializeArea(area: ActivityArea & { subs?: ActivitySubActivity[] }) {
  return {
    id: area.areaId,
    key: area.key,
    name: area.name,
    icon: area.icon,
    accent: area.accent,
    activities: (area.subs ?? []).map(serializeSubActivity),
  };
}

export function serializeSubActivity(s: ActivitySubActivity) {
  return {
    id: s.subId,
    key: s.key,
    name: s.name,
    icon: s.icon,
    hint: s.hint ?? undefined,
    promotedFromOther: s.promotedFromOther,
  };
}

export function serializeSession(s: ExerciseSession) {
  return {
    id: s.sessionId,
    exerciseKey: s.exerciseKey,
    exerciseName: s.exerciseName,
    areaKey: s.areaKey,
    quantity: s.quantity,
    unit: s.unit,
    durationMin: s.durationMin,
    points: s.points,
    performedAt: s.performedAt,
  };
}