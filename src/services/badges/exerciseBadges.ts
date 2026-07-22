// Badges for the EXERCISE taxonomy — the flow the mobile app actually uses
// (POST /api/exercise/log -> ExerciseSession). Two kinds live here:
//   1. Tiered frequency/streak badges at three scopes (a specific exercise, an
//      area, or "any exercise"), backed by the ExerciseBadge table.
//   2. "Log a specific exercise" one-off badges, backed by a SpecialtyBadge with
//      ruleKey "exercise:<exerciseKey>" (e.g. Baller = "exercise:basketball").
// See docs/badge-system-implementation.md.

import { Transaction, fn, col, literal } from "sequelize";
import { sequelize } from "../../config/database";
import { Badge, BadgeType } from "../../models/Badges";
import { ExerciseBadge, ExerciseBadgeScope, ExerciseBadgeMetric } from "../../models/ExerciseBadge";
import { SpecialtyBadge } from "../../models/SpecialtyBadge";
import { ExerciseSession } from "../../models/ExerciseSession";
import { ActivityArea } from "../../models/ActivityArea";
import { ActivitySubActivity } from "../../models/ActivitySubActivity";
import { awardBadgeIfNotOwned } from "./awardBadge";
import { countStreakFromDays } from "./dateUtils";
import { FREQUENCY_TIERS, STREAK_TIERS, TIER_XP, TIER_SUFFIX } from "./constants";

export const EXERCISE_RULE_PREFIX = "exercise:";

const METRIC_WORD: Record<string, string> = {
  [ExerciseBadgeMetric.FREQUENCY]: "Regular",
  [ExerciseBadgeMetric.STREAK]: "Streak",
};

const METRIC_BADGE_TYPE: Record<string, string> = {
  [ExerciseBadgeMetric.FREQUENCY]: BadgeType.EXERCISE_FREQUENCY,
  [ExerciseBadgeMetric.STREAK]: BadgeType.EXERCISE_STREAK,
};

export function templateExerciseBadgeName(metric: string, tier: number, label: string): string {
  return `${label} ${METRIC_WORD[metric]} ${TIER_SUFFIX[tier - 1]}`;
}

// ── Generation ───────────────────────────────────────────────────────────────

// Creates the frequency + streak badge sets for one scope target (idempotent —
// skips a (scope,targetKey,metric,tier) that already exists). `label` is the
// display name used in badge names (exercise name / area name / "Any Exercise").
export async function ensureExerciseScopeBadges(
  scope: ExerciseBadgeScope,
  targetKey: string | null,
  label: string,
  transaction: Transaction,
): Promise<void> {
  const metrics: { metric: ExerciseBadgeMetric; tiers: number[] }[] = [
    { metric: ExerciseBadgeMetric.FREQUENCY, tiers: FREQUENCY_TIERS },
    { metric: ExerciseBadgeMetric.STREAK, tiers: STREAK_TIERS },
  ];

  for (const { metric, tiers } of metrics) {
    for (let i = 0; i < tiers.length; i++) {
      const tier = i + 1;
      const existing = await ExerciseBadge.findOne({
        where: { scope, targetKey, metric, tier },
        transaction,
      });
      if (existing) continue;

      const badge = await Badge.create(
        {
          badgeName: templateExerciseBadgeName(metric, tier, label),
          badgeImage: null,
          badgeDescription: `${label} — ${METRIC_WORD[metric]} tier ${tier}`,
          awardXpValue: TIER_XP[i],
          badgeType: METRIC_BADGE_TYPE[metric],
        },
        { transaction },
      );
      await ExerciseBadge.create(
        { badgeId: badge.badgeID, scope, targetKey, metric, tier, threshold: tiers[i] },
        { transaction },
      );
    }
  }
}

// Convenience wrapper for callers without a transaction (e.g. admin adding a
// new exercise/area) — runs the idempotent generation in its own transaction.
export async function generateExerciseBadgesFor(
  scope: ExerciseBadgeScope,
  targetKey: string | null,
  label: string,
): Promise<void> {
  const t = await sequelize.transaction();
  try {
    await ensureExerciseScopeBadges(scope, targetKey, label, t);
    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

// Seeds/backfills exercise badges for every area + sub-activity in the catalog,
// plus the "any exercise" set. Idempotent — safe to run on every boot, and it
// picks up any exercises/areas added since last run. Called from config/seed.ts.
export async function seedExerciseBadges(): Promise<void> {
  const before = await ExerciseBadge.count();
  const t = await sequelize.transaction();
  try {
    await ensureExerciseScopeBadges(ExerciseBadgeScope.ANY, null, "Any Exercise", t);
    for (const area of await ActivityArea.findAll({ transaction: t })) {
      await ensureExerciseScopeBadges(ExerciseBadgeScope.AREA, area.key, area.name, t);
    }
    for (const sub of await ActivitySubActivity.findAll({ transaction: t })) {
      await ensureExerciseScopeBadges(ExerciseBadgeScope.EXERCISE, sub.key, sub.name, t);
    }
    await t.commit();
    if (before === 0) console.log("Seeded exercise badges");
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

// ── Evaluation (called from logExercise, inside its transaction) ─────────────

async function awardTiers(
  scope: ExerciseBadgeScope,
  targetKey: string | null,
  metric: ExerciseBadgeMetric,
  value: number,
  userId: number,
  transaction: Transaction,
): Promise<void> {
  const badges = await ExerciseBadge.findAll({ where: { scope, targetKey, metric }, transaction });
  for (const b of badges) {
    if (value >= b.threshold) await awardBadgeIfNotOwned(userId, b.badgeId, transaction);
  }
}

// Distinct calendar days (YYYY-MM-DD, DESC) with a qualifying session, then the
// in-memory streak walk — same approach as activity streaks, sourced from
// ExerciseSession.
async function exerciseStreakDays(
  userId: number,
  where: Record<string, unknown>,
  transaction: Transaction,
): Promise<string[]> {
  const rows = (await ExerciseSession.findAll({
    where: { userId, ...where },
    attributes: [[fn("DISTINCT", fn("DATE", col("performedAt"))), "day"]],
    order: [[literal('"day"'), "DESC"]],
    raw: true,
    transaction,
  })) as unknown as { day: string }[];
  return rows.map((r) => r.day);
}

export async function evaluateExerciseBadges(
  userId: number,
  session: ExerciseSession,
  transaction: Transaction,
): Promise<void> {
  const exerciseKey = session.exerciseKey;
  const areaKey = session.areaKey;
  const asOf = session.performedAt;

  // 1. "Log a specific exercise" specialty badges (e.g. Baller).
  if (exerciseKey) {
    const specialty = await SpecialtyBadge.findAll({
      where: { ruleKey: `${EXERCISE_RULE_PREFIX}${exerciseKey}` },
      transaction,
    });
    for (const b of specialty) await awardBadgeIfNotOwned(userId, b.badgeId, transaction);
  }

  // 2. Frequency — per-exercise, per-area, any.
  if (exerciseKey) {
    const n = await ExerciseSession.count({ where: { userId, exerciseKey }, transaction });
    await awardTiers(ExerciseBadgeScope.EXERCISE, exerciseKey, ExerciseBadgeMetric.FREQUENCY, n, userId, transaction);
  }
  if (areaKey) {
    const n = await ExerciseSession.count({ where: { userId, areaKey }, transaction });
    await awardTiers(ExerciseBadgeScope.AREA, areaKey, ExerciseBadgeMetric.FREQUENCY, n, userId, transaction);
  }
  const anyN = await ExerciseSession.count({ where: { userId }, transaction });
  await awardTiers(ExerciseBadgeScope.ANY, null, ExerciseBadgeMetric.FREQUENCY, anyN, userId, transaction);

  // 3. Streak — per-exercise, per-area, any.
  if (exerciseKey) {
    const days = await exerciseStreakDays(userId, { exerciseKey }, transaction);
    await awardTiers(ExerciseBadgeScope.EXERCISE, exerciseKey, ExerciseBadgeMetric.STREAK, countStreakFromDays(days, asOf), userId, transaction);
  }
  if (areaKey) {
    const days = await exerciseStreakDays(userId, { areaKey }, transaction);
    await awardTiers(ExerciseBadgeScope.AREA, areaKey, ExerciseBadgeMetric.STREAK, countStreakFromDays(days, asOf), userId, transaction);
  }
  const anyDays = await exerciseStreakDays(userId, {}, transaction);
  await awardTiers(ExerciseBadgeScope.ANY, null, ExerciseBadgeMetric.STREAK, countStreakFromDays(anyDays, asOf), userId, transaction);
}
