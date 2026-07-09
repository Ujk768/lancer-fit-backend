// src/utils/serializers.ts
//
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

export function serializeUser(u: User) {
  return {
    id: u.userId,
    firstName: u.firstName,
    lastName: u.lastName,
    name: [u.firstName, u.lastName].filter(Boolean).join(" ").trim(),
    email: u.email,
    role: u.role,
    faculty: u.faculty,
    nationality: u.nationality,
    totalXp: u.totalXp,
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