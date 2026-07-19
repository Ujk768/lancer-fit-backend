// The single chokepoint that actually grants a badge. Every evaluator across
// all badge types calls this — and only this — to write UserBadge, so
// "has this user already earned this" logic exists in exactly one place.
// See docs/badge-system-spec.md §B.2.

import { Transaction } from "sequelize";
import { Badge } from "../../models/Badges";
import UserBadge from "../../models/UserBadge";
import { User } from "../../models/User";

export async function awardBadgeIfNotOwned(
  userId: number,
  badgeId: number,
  transaction: Transaction,
): Promise<boolean> {
  // findOrCreate + the unique index on (userId, badgeID) makes this atomic —
  // two near-simultaneous awards for the same user+badge can't both "win".
  const [, created] = await UserBadge.findOrCreate({
    where: { userId, badgeID: badgeId },
    defaults: { userId, badgeID: badgeId },
    transaction,
  });

  if (!created) return false;

  const badge = await Badge.findByPk(badgeId, { transaction });
  if (!badge) return false; // shouldn't happen given the FK constraint, defensive only

  await User.increment(
    { totalXp: badge.awardXpValue },
    { where: { userId }, transaction },
  );

  return true;
}
