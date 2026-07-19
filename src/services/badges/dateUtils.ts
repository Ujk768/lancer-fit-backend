// Date-only helpers used by streak calculations — everything here strips
// time-of-day so "same calendar day" comparisons work with plain equality.

export function toDateOnly(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Parses a "YYYY-MM-DD" string (what Postgres DATE(...) returns) into a
// local-midnight Date, so it compares correctly against toDateOnly() output.
export function parseDateOnly(dayStr: string): Date {
  const [year, month, day] = dayStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(d: Date, delta: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + delta);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

// Walks a DESC-sorted list of "YYYY-MM-DD" day strings backward from `asOf`,
// counting consecutive days. Shared by activity streaks (sourced from
// ActivityLog) and, later, quest streaks (sourced from the quest-completion
// table once that exists) — same walk, different day source.
export function countStreakFromDays(dayStrs: string[], asOf: Date): number {
  let streak = 0;
  let cursor = toDateOnly(asOf);

  for (const dayStr of dayStrs) {
    const day = parseDateOnly(dayStr);
    if (day.getTime() === cursor.getTime()) {
      streak += 1;
      cursor = addDays(cursor, -1);
    } else if (day.getTime() < cursor.getTime()) {
      break; // first gap — streak ends here
    }
    // day > cursor can't happen when input is sorted DESC and walked in lockstep
  }

  return streak;
}
