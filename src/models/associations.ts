// src/models/associations.ts
//
// All model relationships in one place (SRP: this file's only job is wiring).
// Fixes from the original:
//   - Removed User.hasMany(Activity) / Activity.belongsTo(User): the Activity
//     model has no userId column, so that association was invalid and would
//     break includes. Activities are a global catalog, not user-owned.
//   - Added ExerciseSession, ActivityArea/SubActivity, Quest relationships.

import { User } from "./User";
import { UserStats } from "./UserStats";
import { Challenge } from "./Challenge";
import { ChallengeParticipant } from "./ChallengeParticipant";
import UserBadge from "./UserBadge";
import Badge from "./Badges";
import { Activity } from "./Activity";
import { ActivityLog } from "./ActivityLog";
import { ExerciseSession } from "./ExerciseSession";
import { ActivityArea } from "./ActivityArea";
import { ActivitySubActivity } from "./ActivitySubActivity";
import { CustomActivity } from "./CustomActivity";

export function defineAssociations() {
  // ── User <-> Challenge (M:N through the participant bridge) ──
  User.belongsToMany(Challenge, {
    through: ChallengeParticipant,
    foreignKey: "userId",
    otherKey: "challengeId",
    as: "tlcChallenges",
  });
  Challenge.belongsToMany(User, {
    through: ChallengeParticipant,
    foreignKey: "challengeId",
    otherKey: "userId",
    as: "participants",
  });

  User.hasMany(ChallengeParticipant, { foreignKey: "userId", as: "participations" });
  Challenge.hasMany(ChallengeParticipant, { foreignKey: "challengeId", as: "participations" });
  ChallengeParticipant.belongsTo(User, { foreignKey: "userId", as: "user" });
  ChallengeParticipant.belongsTo(Challenge, { foreignKey: "challengeId", as: "challenge" });

  // ── User <-> Stats (1:1) ──
  UserStats.belongsTo(User, { foreignKey: "userId", as: "user" });
  User.hasOne(UserStats, { foreignKey: "userId", as: "stats" });

  // ── User <-> Badge (M:N) ──
  User.belongsToMany(Badge, {
    through: UserBadge, foreignKey: "userId", otherKey: "badgeId", as: "badges",
  });
  Badge.belongsToMany(User, {
    through: UserBadge, foreignKey: "badgeId", otherKey: "userId", as: "owners",
  });

  // ── Activity catalog <-> ActivityLog (1:M) ──
  User.hasMany(ActivityLog, { foreignKey: "userId" });
  ActivityLog.belongsTo(User, { foreignKey: "userId" });
  Activity.hasMany(ActivityLog, { foreignKey: "activityId" });
  ActivityLog.belongsTo(Activity, { foreignKey: "activityId" });

  // ── Exercise history for stats (1:M) ──
  User.hasMany(ExerciseSession, { foreignKey: "userId", as: "sessions" });
  ExerciseSession.belongsTo(User, { foreignKey: "userId", as: "user" });
  Activity.hasMany(ExerciseSession, { foreignKey: "activityId" });
  ExerciseSession.belongsTo(Activity, { foreignKey: "activityId" });

  // ── Activity areas <-> sub-activities (1:M) ──
  ActivityArea.hasMany(ActivitySubActivity, { foreignKey: "areaId", as: "subs", onDelete: "CASCADE" });
  ActivitySubActivity.belongsTo(ActivityArea, { foreignKey: "areaId", as: "area" });

  // ── User <-> CustomActivity (1:M) ──
  User.hasMany(CustomActivity, { foreignKey: "userId", as: "customActivities", onDelete: "CASCADE" });
  CustomActivity.belongsTo(User, { foreignKey: "userId", as: "user" });

}