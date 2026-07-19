// Global tier ladders shared by every badge type that has tiers.
// See docs/badge-system-spec.md for how these were decided.

export const FREQUENCY_TIERS = [10, 50, 100];
export const STREAK_TIERS = [7, 30, 100];
export const TIER_XP = [500, 1000, 2500];
export const TIER_SUFFIX = ["I", "II", "III"];

// Challenge Position badges only — gold/silver/bronze reuse the challenge's
// own podiumFirst/Second/Third fields instead, this covers Participant only.
export const PARTICIPANT_XP = 100;
