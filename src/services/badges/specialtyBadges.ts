// Specialty badges: hardcoded one-off rules that can't be expressed as
// data-driven tiers. Adding a new one always takes a developer:
//   1. Write a rule function below and register it in SPECIALTY_RULES.
//   2. An admin then creates the badge via POST /api/badge/add with
//      badgeType "specialty" and your ruleKey — the endpoint rejects keys
//      that aren't registered here, so ship the code first.
// Spec: docs/badge-system-spec.md §F.

import { Op, Transaction } from "sequelize";
import { SpecialtyBadge } from "../../models/SpecialtyBadge";
import { ActivityLog } from "../../models/ActivityLog";
import { Activity } from "../../models/Activity";
import { awardBadgeIfNotOwned } from "./awardBadge";
import { toDateOnly, endOfDay } from "./dateUtils";

type SpecialtyRule = (userId: number, date: Date, transaction: Transaction) => Promise<boolean>;

// 3 distinct activities (not categories) logged on the same calendar day
async function checkTripleActivityDay(
  userId: number,
  date: Date,
  transaction: Transaction,
): Promise<boolean> {
  const logs = await ActivityLog.findAll({
    where: { userId, date: { [Op.between]: [toDateOnly(date), endOfDay(date)] } },
    transaction,
  });
  return new Set(logs.map((l) => l.activityId)).size >= 3;
}

// Cycling + Running + Swimming categories, all logged on the same calendar day.
// FRAGILE BY NATURE: matches Activity.category by literal string — if an admin
// renames one of these categories, this badge silently stops triggering.
// Grep for IRON_MAN_CATEGORIES when renaming categories.
const IRON_MAN_CATEGORIES = ["Cycling", "Running", "Swimming"];

async function checkIronManDay(
  userId: number,
  date: Date,
  transaction: Transaction,
): Promise<boolean> {
  const logs = await ActivityLog.findAll({
    where: { userId, date: { [Op.between]: [toDateOnly(date), endOfDay(date)] } },
    include: [{ model: Activity, attributes: ["category"] }],
    transaction,
  });
  const loggedCategories = new Set(
    logs.map((l) => (l.get("activity") as Activity | undefined)?.category).filter(Boolean),
  );
  return IRON_MAN_CATEGORIES.every((cat) => loggedCategories.has(cat));
}

export const SPECIALTY_RULES: Record<string, SpecialtyRule> = {
  triple_activity_day: checkTripleActivityDay,
  iron_man: checkIronManDay,
};

export const SPECIALTY_RULE_KEYS = Object.keys(SPECIALTY_RULES);

// Called from awardActivityPoints (same hook as evaluateActivityBadges) —
// logging an activity is the only event that can complete these rules.
export async function evaluateSpecialtyBadges(
  userId: number,
  date: Date,
  transaction: Transaction,
): Promise<void> {
  const specialtyBadges = await SpecialtyBadge.findAll({ transaction });
  for (const sb of specialtyBadges) {
    const rule = SPECIALTY_RULES[sb.ruleKey];
    if (!rule) continue; // badge row exists but its rule was never registered — skip, don't throw
    if (await rule(userId, date, transaction)) {
      await awardBadgeIfNotOwned(userId, sb.badgeId, transaction);
    }
  }
}
