// src/models/associations.ts
import { User } from "./User";
import { UserStats } from "./UserStats";
import { Challenge } from "./Challenge";
import { ChallengeParticipant } from "./ChallengeParticipant";
import UserBadge from "./UserBadge";
import Badge from "./Badges";
import { Activity } from "./Activity";
import { ActivityLog } from "./ActivityLog";

export function defineAssociations() {
  // ── M:N — User <-> Challenge through the bridge ──────────────
  User.belongsToMany(Challenge, {
    through: ChallengeParticipant, // the bridge model
    foreignKey: "userId",
    otherKey: "challengeId",
    as: "tlcChallenges", // alias for include queries
  });

  User.hasMany(ChallengeParticipant, {
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

  Challenge.belongsToMany(User, {
    through: ChallengeParticipant,
    foreignKey: "challengeId",
    otherKey: "userId",
    as: "participants",
  });

  // ── Bridge associations — lets you do participant.user etc ───────
  ChallengeParticipant.belongsTo(User, { foreignKey: "userId", as: "user" });
  ChallengeParticipant.belongsTo(Challenge, {
    foreignKey: "challengeId",
    as: "challenge",
  });

  Challenge.hasMany(ChallengeParticipant, {
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
