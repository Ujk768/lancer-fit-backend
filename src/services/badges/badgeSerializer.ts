// Turns raw Badge rows into a frontend-friendly shape by attaching each
// badge's type-specific metadata (tier/threshold/scope/position/etc.) from its
// sub-type table. One batched query per sub-type table, not one per badge.

import { Badge, BadgeType } from "../../models/Badges";
import { ActivityBadge } from "../../models/ActivityBadge";
import { ChallengePositionBadge } from "../../models/ChallengePositionBadge";
import { QuestBadge } from "../../models/QuestBadge";
import { SpecialtyBadge } from "../../models/SpecialtyBadge";

export type BadgeMeta =
  | { kind: "activity"; scope: string; activityId: number | null; category: string | null; metric: string; tier: number; threshold: number }
  | { kind: "challenge_position"; challengeId: number; position: string }
  | { kind: "quest"; metric: string; completionMode: string; tier: number; threshold: number }
  | { kind: "specialty"; ruleKey: string }
  | null;

const ACTIVITY_TYPES: string[] = [
  BadgeType.ACTIVITY_FREQUENCY,
  BadgeType.ACTIVITY_MAGNITUDE,
  BadgeType.ACTIVITY_STREAK,
];
const QUEST_TYPES: string[] = [BadgeType.QUEST_FREQUENCY, BadgeType.QUEST_STREAK];

// Build a badgeId -> meta lookup for a set of badges, batching one query per
// sub-type table.
export async function buildMetaMap(badges: Badge[]): Promise<Map<number, BadgeMeta>> {
  const map = new Map<number, BadgeMeta>();

  const activityIds: number[] = [];
  const challengeIds: number[] = [];
  const questIds: number[] = [];
  const specialtyIds: number[] = [];

  for (const b of badges) {
    if (ACTIVITY_TYPES.includes(b.badgeType)) activityIds.push(b.badgeID);
    else if (b.badgeType === BadgeType.CHALLENGE_POSITION) challengeIds.push(b.badgeID);
    else if (QUEST_TYPES.includes(b.badgeType)) questIds.push(b.badgeID);
    else if (b.badgeType === BadgeType.SPECIALTY) specialtyIds.push(b.badgeID);
  }

  if (activityIds.length) {
    for (const ab of await ActivityBadge.findAll({ where: { badgeId: activityIds } })) {
      map.set(ab.badgeId, {
        kind: "activity", scope: ab.scope, activityId: ab.activityId,
        category: ab.category, metric: ab.metric, tier: ab.tier, threshold: ab.threshold,
      });
    }
  }
  if (challengeIds.length) {
    for (const cpb of await ChallengePositionBadge.findAll({ where: { badgeId: challengeIds } })) {
      map.set(cpb.badgeId, { kind: "challenge_position", challengeId: cpb.challengeId, position: cpb.position });
    }
  }
  if (questIds.length) {
    for (const qb of await QuestBadge.findAll({ where: { badgeId: questIds } })) {
      map.set(qb.badgeId, {
        kind: "quest", metric: qb.metric, completionMode: qb.completionMode,
        tier: qb.tier, threshold: qb.threshold,
      });
    }
  }
  if (specialtyIds.length) {
    for (const sb of await SpecialtyBadge.findAll({ where: { badgeId: specialtyIds } })) {
      map.set(sb.badgeId, { kind: "specialty", ruleKey: sb.ruleKey });
    }
  }

  return map;
}

export function serializeBadge(badge: Badge, meta: BadgeMeta, earnedAt?: Date) {
  return {
    badgeId: badge.badgeID,
    name: badge.badgeName,
    image: badge.badgeImage,
    description: badge.badgeDescription,
    xp: badge.awardXpValue,
    type: badge.badgeType,
    secret: badge.secret,
    meta: meta ?? null,
    ...(earnedAt !== undefined && { earnedAt }),
  };
}
