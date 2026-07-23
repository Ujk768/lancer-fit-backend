// Activity badges: Frequency / Magnitude / Streak, scoped to a specific
// activity, its category, or "any activity". See docs/badge-system-spec.md §C.

import { Transaction } from "sequelize";
import { Badge, BadgeType } from "../../models/Badges";
import { ActivityBadge } from "../../models/ActivityBadge";
import { Activity } from "../../models/Activity";
import { ActivityLog } from "../../models/ActivityLog";
import { awardBadgeIfNotOwned } from "./awardBadge";
import { computeCurrentStreak } from "./streak";
import { FREQUENCY_TIERS, STREAK_TIERS, TIER_XP, TIER_SUFFIX } from "./constants";

type Metric = "frequency" | "magnitude" | "streak";
type Scope = "activity" | "category" | "any";

const METRIC_WORD: Record<Metric, string> = {
  frequency: "Regular",
  streak: "Streak",
  magnitude: "Power",
};

const METRIC_BADGE_TYPE: Record<Metric, string> = {
  frequency: BadgeType.ACTIVITY_FREQUENCY,
  magnitude: BadgeType.ACTIVITY_MAGNITUDE,
  streak: BadgeType.ACTIVITY_STREAK,
};

export function templateBadgeName(metric: Metric, tier: number, label: string): string {
  return `${label} ${METRIC_WORD[metric]} ${TIER_SUFFIX[tier - 1]}`;
}

export type BadgeOverride = { name?: string; image?: string };
export type MagnitudeTierInput = BadgeOverride & { threshold: number };

export interface ActivityBadgeInput {
  magnitude: [MagnitudeTierInput, MagnitudeTierInput, MagnitudeTierInput];
  activityFrequency?: (BadgeOverride | undefined)[];
  activityStreak?: (BadgeOverride | undefined)[];
  categoryFrequency?: (BadgeOverride | undefined)[];
  categoryStreak?: (BadgeOverride | undefined)[];
  anyFrequency?: (BadgeOverride | undefined)[];
  anyStreak?: (BadgeOverride | undefined)[];
}

async function createTieredBadges(
  scope: Scope,
  metric: Metric,
  label: string,
  thresholds: number[],
  overrides: (BadgeOverride | undefined)[] | undefined,
  extra: { activityId?: number; category?: string },
  transaction: Transaction,
): Promise<void> {
  for (let i = 0; i < thresholds.length; i++) {
    const tier = i + 1;
    const override = overrides?.[i];

    const badge = await Badge.create(
      {
        badgeName: override?.name ?? templateBadgeName(metric, tier, label),
        badgeImage: override?.image ?? null,
        badgeDescription: `${label} — ${METRIC_WORD[metric]} tier ${tier}`,
        awardXpValue: TIER_XP[i],
        badgeType: METRIC_BADGE_TYPE[metric],
      },
      { transaction },
    );

    await ActivityBadge.create(
      {
        badgeId: badge.badgeID,
        scope,
        activityId: extra.activityId ?? null,
        category: extra.category ?? null,
        metric,
        tier,
        threshold: thresholds[i],
      },
      { transaction },
    );
  }
}

export async function ensureActivityBadges(
  activity: Activity,
  input: ActivityBadgeInput,
  transaction: Transaction,
): Promise<void> {
  // 1. Magnitude — always, exactly 3, admin-supplied thresholds (units differ
  //    per activity, so there's no global ladder for this one)
  await createTieredBadges(
    "activity",
    "magnitude",
    activity.activityName,
    input.magnitude.map((m) => m.threshold),
    input.magnitude,
    { activityId: activity.activityId },
    transaction,
  );

  // 2. Activity-scope frequency & streak — always, global tier ladders
  await createTieredBadges(
    "activity", "frequency", activity.activityName, FREQUENCY_TIERS,
    input.activityFrequency, { activityId: activity.activityId }, transaction,
  );
  await createTieredBadges(
    "activity", "streak", activity.activityName, STREAK_TIERS,
    input.activityStreak, { activityId: activity.activityId }, transaction,
  );

  // 3. Category-scope — only the first time this category gets any badges
  if (activity.category) {
    const categoryExists = await ActivityBadge.count({
      where: { scope: "category", category: activity.category },
      transaction,
    });
    if (categoryExists === 0) {
      await createTieredBadges(
        "category", "frequency", activity.category, FREQUENCY_TIERS,
        input.categoryFrequency, { category: activity.category }, transaction,
      );
      await createTieredBadges(
        "category", "streak", activity.category, STREAK_TIERS,
        input.categoryStreak, { category: activity.category }, transaction,
      );
    }
  }

  // 4. Any-scope — only the very first time any activity is ever created
  const anyExists = await ActivityBadge.count({ where: { scope: "any" }, transaction });
  if (anyExists === 0) {
    await createTieredBadges(
      "any", "frequency", "Any Activity", FREQUENCY_TIERS,
      input.anyFrequency, {}, transaction,
    );
    await createTieredBadges(
      "any", "streak", "Any Activity", STREAK_TIERS,
      input.anyStreak, {}, transaction,
    );
  }
}

async function awardTiersAtOrBelow(
  metric: "frequency" | "streak",
  where: Record<string, unknown>,
  value: number,
  userId: number,
  transaction: Transaction,
): Promise<void> {
  const badges = await ActivityBadge.findAll({ where: { ...where, metric }, transaction });
  for (const b of badges) {
    if (value >= b.threshold) {
      await awardBadgeIfNotOwned(userId, b.badgeId, transaction);
    }
  }
}

export async function evaluateActivityBadges(
  userId: number,
  activity: Activity,
  log: ActivityLog,
  transaction: Transaction,
): Promise<void> {
  // Magnitude — every newly-crossed tier, not just the highest (a single big
  // log can jump past tier 1 and 2 on the way to tier 3)
  const magnitudeBadges = await ActivityBadge.findAll({
    where: { scope: "activity", activityId: activity.activityId, metric: "magnitude" },
    transaction,
  });
  for (const mb of magnitudeBadges) {
    if (log.unitsLogged >= mb.threshold) {
      await awardBadgeIfNotOwned(userId, mb.badgeId, transaction);
    }
  }

  // Frequency — activity / category / any scopes
  const activityCount = await ActivityLog.count({
    where: { userId, activityId: activity.activityId },
    transaction,
  });
  await awardTiersAtOrBelow(
    "frequency", { scope: "activity", activityId: activity.activityId }, activityCount, userId, transaction,
  );

  if (activity.category) {
    const categoryCount = await ActivityLog.count({
      where: { userId },
      include: [{ model: Activity, attributes: [], where: { category: activity.category } }],
      distinct: true,
      transaction,
    });
    await awardTiersAtOrBelow(
      "frequency", { scope: "category", category: activity.category }, categoryCount, userId, transaction,
    );
  }

  const anyCount = await ActivityLog.count({ where: { userId }, transaction });
  await awardTiersAtOrBelow("frequency", { scope: "any" }, anyCount, userId, transaction);

  // Streak — activity / category / any scopes
  const activityStreak = await computeCurrentStreak(
    userId, { type: "activity", activityId: activity.activityId }, log.date, transaction,
  );
  await awardTiersAtOrBelow(
    "streak", { scope: "activity", activityId: activity.activityId }, activityStreak, userId, transaction,
  );

  if (activity.category) {
    const categoryStreak = await computeCurrentStreak(
      userId, { type: "category", category: activity.category }, log.date, transaction,
    );
    await awardTiersAtOrBelow(
      "streak", { scope: "category", category: activity.category }, categoryStreak, userId, transaction,
    );
  }

  const anyStreak = await computeCurrentStreak(userId, { type: "any" }, log.date, transaction);
  await awardTiersAtOrBelow("streak", { scope: "any" }, anyStreak, userId, transaction);
}
