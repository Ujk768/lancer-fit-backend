// src/models/associations.ts
import { User } from "./User";
import { UserStats } from "./UserStats";
import { TLCChallenge } from "./Challenge";
import { TLCChallengeParticipant } from "./Participant";
import { PersonalChallenge } from "./Challenge";

import UserBadge from "./UserBadge";
import Badge from "./Badges";

export function defineAssociations() {
  // ── M:N — User <-> TLCChallenge through the bridge ──────────────
  User.belongsToMany(TLCChallenge, {
    through: TLCChallengeParticipant, // the bridge model
    foreignKey: "userId",
    otherKey: "challengeId",
    as: "tlcChallenges", // alias for include queries
  });

  User.hasMany(TLCChallengeParticipant, {
    foreignKey: "userId",
    as: "participations",
  });

  UserStats.belongsTo(User, {
    foreignKey: "userId",
    as: "user",
  });

  // ── 1:M — User -> PersonalChallenge ─────────────────────────────
  User.hasMany(PersonalChallenge, {
    foreignKey: "userId",
    as: "personalChallenges",
    onDelete: "CASCADE",
  });

  User.belongsToMany(Badge, {
    through: UserBadge,
    foreignKey: "userId",
    otherKey: "badgeId",
    as: "badges", // Allows: user.badges to get all badges earned by a user
  });

  TLCChallenge.belongsToMany(User, {
    through: TLCChallengeParticipant,
    foreignKey: "challengeId",
    otherKey: "userId",
    as: "participants",
  });

  // ── Bridge associations — lets you do participant.user etc ───────
  TLCChallengeParticipant.belongsTo(User, { foreignKey: "userId", as: "user" });
  TLCChallengeParticipant.belongsTo(TLCChallenge, {
    foreignKey: "challengeId",
    as: "challenge",
  });

  TLCChallenge.hasMany(TLCChallengeParticipant, {
    foreignKey: "challengeId",
    as: "participations",
  });

  PersonalChallenge.belongsTo(User, {
    foreignKey: "userId",
    as: "user",
  });

  Badge.belongsToMany(User, {
    through: UserBadge,
    foreignKey: "badgeId",
    otherKey: "userId",
    as: "owners", // Allows: badge.owners to see all users who earned this badge
  });
}
