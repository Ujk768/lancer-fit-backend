// Daily Quest badges: 12 fixed badges (frequency/streak × any_one/all_three ×
// 3 tiers), seeded once. Quest COMPLETION tracking is owned by separate work —
// see the integration comment on evaluateQuestBadges for the exact contract.
// Spec: docs/badge-system-spec.md §E.

import { Transaction } from "sequelize";
import { Badge, BadgeType } from "../../models/Badges";
import { QuestBadge, QuestBadgeMetric, QuestCompletionMode } from "../../models/QuestBadge";
import { awardBadgeIfNotOwned } from "./awardBadge";
import { resolveDailyQuests } from "../dailyQuests";
import { countStreakFromDays, parseDateOnly } from "./dateUtils";
import { FREQUENCY_TIERS, STREAK_TIERS, TIER_XP, TIER_SUFFIX } from "./constants";

const QUEST_LABEL: Record<string, Record<string, string>> = {
  [QuestBadgeMetric.FREQUENCY]: {
    [QuestCompletionMode.ANY_ONE]: "Quest Regular",
    [QuestCompletionMode.ALL_THREE]: "Quest Perfectionist",
  },
  [QuestBadgeMetric.STREAK]: {
    [QuestCompletionMode.ANY_ONE]: "Quest Streak",
    [QuestCompletionMode.ALL_THREE]: "Perfect Streak",
  },
};

export function templateQuestBadgeName(metric: string, completionMode: string, tier: number): string {
  return `${QUEST_LABEL[metric][completionMode]} ${TIER_SUFFIX[tier - 1]}`;
}

// One-time idempotent seed for the 12 fixed quest badges — called from
// src/config/seed.ts alongside the existing admin/quest/area seeds.
export async function seedQuestBadges(): Promise<void> {
  if ((await QuestBadge.count()) > 0) return;

  for (const metric of [QuestBadgeMetric.FREQUENCY, QuestBadgeMetric.STREAK]) {
    for (const completionMode of [QuestCompletionMode.ANY_ONE, QuestCompletionMode.ALL_THREE]) {
      const tiers = metric === QuestBadgeMetric.FREQUENCY ? FREQUENCY_TIERS : STREAK_TIERS;
      for (const [i, threshold] of tiers.entries()) {
        const tier = i + 1;
        const badge = await Badge.create({
          badgeName: templateQuestBadgeName(metric, completionMode, tier),
          badgeImage: null,
          badgeDescription:
            completionMode === QuestCompletionMode.ANY_ONE
              ? `Daily quests — ${metric} tier ${tier} (any quest counts)`
              : `Daily quests — ${metric} tier ${tier} (complete every quest of the day)`,
          awardXpValue: TIER_XP[i],
          badgeType: metric === QuestBadgeMetric.FREQUENCY ? BadgeType.QUEST_FREQUENCY : BadgeType.QUEST_STREAK,
        });
        await QuestBadge.create({ badgeId: badge.badgeID, metric, completionMode, tier, threshold });
      }
    }
  }
  console.log("Seeded 12 quest badges");
}

// What evaluateQuestBadges needs to know about a user's completion history.
// All day arrays are "YYYY-MM-DD" strings sorted newest-first.
export interface QuestCompletionData {
  totalCompletions: number;        // lifetime count of individual completion EVENTS (2 quests in one day = 2)
  daysWithAnyCompletion: string[]; // distinct days with >= 1 completion, DESC
  daysWithFullCompletion: string[]; // distinct days where EVERY active quest that day was completed, DESC
}

// ── STUB — implement when the quest-completion table exists ──────────────────
// Replace the throw with real queries against your completion table. Use
// resolveDailyQuests(dateKey) (services/dailyQuests.ts) to know how many
// quests were active on a given day when computing daysWithFullCompletion.
async function getQuestCompletionData(
  userId: number,
  transaction: Transaction,
): Promise<QuestCompletionData> {
  void userId; void transaction;
  throw new Error(
    "getQuestCompletionData: quest completion tracking is not built yet — " +
    "implement this against your completion table (see the integration comment on evaluateQuestBadges).",
  );
}

/**
 * BADGE SYSTEM INTEGRATION — READ THIS IF YOU'RE BUILDING QUEST COMPLETION
 *
 * After you write your "user completed quest X" record — inside your own
 * DB transaction — call this once, passing that same transaction:
 *
 *     await evaluateQuestBadges(userId, dateKey, transaction);
 *
 * `dateKey` is the "YYYY-MM-DD" calendar day the completion happened on —
 * reuse DailyQuestOverride's date-key format so the two stay joinable.
 *
 * This function only READS your completion data (to check whether the user
 * just crossed a badge tier) and writes to the badge tables via
 * awardBadgeIfNotOwned — it never touches your table.
 *
 * One thing to implement before it works: getQuestCompletionData (directly
 * above) currently throws. Fill it in with queries against your table so it
 * returns { totalCompletions, daysWithAnyCompletion, daysWithFullCompletion }
 * — the shape is documented on the QuestCompletionData interface. Everything
 * downstream of that (tier matching, streak walks, awarding, idempotency)
 * already works and shouldn't need changes.
 *
 * "Active quests for a day" must come from resolveDailyQuests
 * (services/dailyQuests.ts) — the same function the GET /api/quest/daily
 * endpoint uses — never a hardcoded 3, since admins can override a day
 * with 1–5 quests.
 *
 * Full spec: docs/badge-system-spec.md §E.
 */
export async function evaluateQuestBadges(
  userId: number,
  dateKey: string,
  transaction: Transaction,
): Promise<void> {
  const data = await getQuestCompletionData(userId, transaction);
  const asOf = parseDateOnly(dateKey);

  // Current value per (metric, completionMode) combination
  const valueFor: Record<string, Record<string, number>> = {
    [QuestBadgeMetric.FREQUENCY]: {
      [QuestCompletionMode.ANY_ONE]: data.totalCompletions,
      [QuestCompletionMode.ALL_THREE]: data.daysWithFullCompletion.length,
    },
    [QuestBadgeMetric.STREAK]: {
      [QuestCompletionMode.ANY_ONE]: countStreakFromDays(data.daysWithAnyCompletion, asOf),
      [QuestCompletionMode.ALL_THREE]: countStreakFromDays(data.daysWithFullCompletion, asOf),
    },
  };

  const questBadges = await QuestBadge.findAll({ transaction });
  for (const qb of questBadges) {
    const value = valueFor[qb.metric]?.[qb.completionMode];
    if (value != null && value >= qb.threshold) {
      await awardBadgeIfNotOwned(userId, qb.badgeId, transaction);
    }
  }
}
