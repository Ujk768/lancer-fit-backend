// src/models/associations.ts
import { User } from "./User";
import { UserStats } from "./UserStats";
import { TLCChallenge } from "./Challenge";
import { TLCChallengeParticipant } from "./Participant";
import UserBadge from "./UserBadge";
import Badge from "./Badges";
import { Activity } from "./Activity";
import { ActivityLog } from "./ActivityLog";

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

  // ── 1:M — User -> Activity ──────────────────────────────────────
  User.hasMany(Activity, {
    foreignKey: "userId",
    as: "activities",
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

  Activity.belongsTo(User, {
    foreignKey: "userId",
    as: "user",
  });

  Badge.belongsToMany(User, {
    through: UserBadge,
    foreignKey: "badgeId",
    otherKey: "userId",
    as: "owners", // Allows: badge.owners to see all users who earned this badge
  });

  User.hasMany(ActivityLog, { foreignKey: "userId" });
  ActivityLog.belongsTo(User, { foreignKey: "userId" });

  Activity.hasMany(ActivityLog, { foreignKey: "activityId" });
  ActivityLog.belongsTo(Activity, { foreignKey: "activityId" });
}
