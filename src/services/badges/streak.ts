// Streaks are computed on demand, never stored — see docs/badge-system-spec.md
// §B.3 for why (a stored counter can silently drift from ActivityLog; this
// can't). One query fetches every distinct qualifying day, then an in-memory
// walk backward from `asOf` counts the current streak.

import { Transaction, fn, col, literal } from "sequelize";
import { ActivityLog } from "../../models/ActivityLog";
import { Activity } from "../../models/Activity";
import { countStreakFromDays } from "./dateUtils";

export type StreakScope =
  | { type: "activity"; activityId: number }
  | { type: "category"; category: string }
  | { type: "any" };

// `transaction` is required, not optional: this is always called right after
// writing today's ActivityLog row, inside that same transaction. Without
// passing it through, the query wouldn't see that just-written row yet.
export async function computeCurrentStreak(
  userId: number,
  scope: StreakScope,
  asOf: Date,
  transaction: Transaction,
): Promise<number> {
  const where: Record<string, unknown> = { userId };
  const include: unknown[] = [];

  if (scope.type === "activity") {
    where.activityId = scope.activityId;
  } else if (scope.type === "category") {
    include.push({ model: Activity, attributes: [], where: { category: scope.category } });
  }
  // scope.type === "any" → no extra filter, every log for this user counts

  const rows = (await ActivityLog.findAll({
    where,
    include: include as never,
    attributes: [[fn("DISTINCT", fn("DATE", col("activity_logs.date"))), "day"]],
    order: [[literal('"day"'), "DESC"]],
    raw: true,
    transaction,
  })) as unknown as { day: string }[];

  return countStreakFromDays(rows.map((r) => r.day), asOf);
}
