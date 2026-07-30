// Challenge Position badges: gold/silver/bronze/participant, one fresh set
// per challenge, settled when the challenge ends. See docs/badge-system-spec.md §D.

import { Op, Transaction } from "sequelize";
import { Badge, BadgeType } from "../../models/Badges";
import { ChallengePositionBadge, ChallengePosition } from "../../models/ChallengePositionBadge";
import { Challenge } from "../../models/Challenge";
import { ChallengeParticipant } from "../../models/ChallengeParticipant";
import { awardBadgeIfNotOwned } from "./awardBadge";
import { PARTICIPANT_XP } from "./constants";

const POSITION_LABEL: Record<string, string> = {
  [ChallengePosition.GOLD]: "Champion",
  [ChallengePosition.SILVER]: "Runner-Up",
  [ChallengePosition.BRONZE]: "Third Place",
  [ChallengePosition.PARTICIPANT]: "Participant",
};

export function templateChallengeBadgeName(position: string, challengeName: string): string {
  return `${challengeName} ${POSITION_LABEL[position]}`;
}

export type BadgeOverride = { name?: string; image?: string };

export interface ChallengeBadgeInput {
  gold?: BadgeOverride;
  silver?: BadgeOverride;
  bronze?: BadgeOverride;
  participant?: BadgeOverride;
}

// Creates the 4 position badges for a freshly-created challenge, inside the
// same transaction that creates the challenge itself. Gold/silver/bronze XP
// comes from the challenge's own podiumFirst/Second/Third fields (per-challenge
// reward sizing); participant XP is the flat PARTICIPANT_XP constant.
export async function createChallengeBadges(
  challenge: Challenge,
  input: ChallengeBadgeInput,
  transaction: Transaction,
): Promise<void> {
  const positions: { position: string; override?: BadgeOverride; xp: number }[] = [
    { position: ChallengePosition.GOLD, override: input.gold, xp: challenge.podiumFirst },
    { position: ChallengePosition.SILVER, override: input.silver, xp: challenge.podiumSecond },
    { position: ChallengePosition.BRONZE, override: input.bronze, xp: challenge.podiumThird },
    { position: ChallengePosition.PARTICIPANT, override: input.participant, xp: PARTICIPANT_XP },
  ];

  for (const { position, override, xp } of positions) {
    const badge = await Badge.create(
      {
        badgeName: override?.name ?? templateChallengeBadgeName(position, challenge.challengeName),
        badgeImage: override?.image ?? null,
        badgeDescription: `${POSITION_LABEL[position]} — ${challenge.challengeName}`,
        awardXpValue: xp,
        badgeType: BadgeType.CHALLENGE_POSITION,
      },
      { transaction },
    );

    await ChallengePositionBadge.create(
      { badgeId: badge.badgeID, challengeId: challenge.challengeId, position },
      { transaction },
    );
  }
}

/**
 * BADGE SYSTEM INTEGRATION — READ THIS IF YOU'RE BUILDING "END CHALLENGE"
 *
 * When the admin ends a challenge, flip challenge.status inside a transaction
 * and call this once with that same transaction:
 *
 *     await settleChallengePositionBadges(challengeId, transaction);
 *
 * That's the whole contract — this function does the rest (ranking, awarding,
 * XP). It's idempotent: calling it twice for the same challenge just
 * re-confirms the same awards, so an accidental double-trigger is harmless.
 *
 * Ranking is by distinct point VALUE, not row position — everyone tied at the
 * top value gets gold, everyone at the second value gets silver, etc. Anyone
 * with pointsAwarded != 0 who missed the podium gets the participant badge;
 * participants who never had points approved get nothing.
 *
 * Full spec: docs/badge-system-spec.md §D.4.
 */
export async function settleChallengePositionBadges(
  challengeId: number,
  transaction: Transaction,
): Promise<void> {
  const positionRows = await ChallengePositionBadge.findAll({ where: { challengeId }, transaction });
  const badgeIdFor: Record<string, number> = {};
  for (const row of positionRows) badgeIdFor[row.position] = row.badgeId;
  // All 4 positions are expected (createChallengeBadges made them at creation
  // time). A missing one is a data-integrity bug worth logging — but not a
  // reason to block everyone else's awards, so we skip that position below.
  if (positionRows.length < 4) {
    console.warn(`settleChallengePositionBadges: challenge ${challengeId} has only ${positionRows.length}/4 position badges`);
  }

  const participants = await ChallengeParticipant.findAll({
    where: { challengeId, pointsAwarded: { [Op.ne]: 0 } },
    order: [["pointsAwarded", "DESC"]],
    transaction,
  });

  // Distinct point values, highest first — participants is already sorted DESC
  // and Set preserves insertion order, so no extra sorting needed.
  const [goldValue, silverValue, bronzeValue] = [...new Set(participants.map((p) => p.pointsAwarded))];

  for (const participant of participants) {
    const position =
      participant.pointsAwarded === goldValue ? ChallengePosition.GOLD :
      participant.pointsAwarded === silverValue ? ChallengePosition.SILVER :
      participant.pointsAwarded === bronzeValue ? ChallengePosition.BRONZE :
      ChallengePosition.PARTICIPANT;

    const badgeId = badgeIdFor[position];
    if (badgeId == null) continue; // missing position badge — warned above

    await awardBadgeIfNotOwned(participant.userId, badgeId, transaction);
  }
}
