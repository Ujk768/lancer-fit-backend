// src/models/associations.ts
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

export function defineAssociations() {
  User.belongsToMany(Challenge, {
    through: ChallengeParticipant, foreignKey: "userId",
    otherKey: "challengeId", as: "tlcChallenges",
  });
  Challenge.belongsToMany(User, {
    through: ChallengeParticipant, foreignKey: "challengeId",
    otherKey: "userId", as: "participants",
  });

  User.hasMany(ChallengeParticipant, { foreignKey: "userId", as: "participations" });
  Challenge.hasMany(ChallengeParticipant, { foreignKey: "challengeId", as: "participations" });
  ChallengeParticipant.belongsTo(User, { foreignKey: "userId", as: "user" });
  ChallengeParticipant.belongsTo(Challenge, { foreignKey: "challengeId", as: "challenge" });

  UserStats.belongsTo(User, { foreignKey: "userId", as: "user" });
  User.hasOne(UserStats, { foreignKey: "userId", as: "stats" });

  User.belongsToMany(Badge, {
    through: UserBadge, foreignKey: "userId", otherKey: "badgeId", as: "badges",
  });
  Badge.belongsToMany(User, {
    through: UserBadge, foreignKey: "badgeId", otherKey: "userId", as: "owners",
  });

  User.hasMany(ActivityLog, { foreignKey: "userId" });
  ActivityLog.belongsTo(User, { foreignKey: "userId" });
  Activity.hasMany(ActivityLog, { foreignKey: "activityId" });
  ActivityLog.belongsTo(Activity, { foreignKey: "activityId" });

  User.hasMany(ExerciseSession, { foreignKey: "userId", as: "sessions" });
  ExerciseSession.belongsTo(User, { foreignKey: "userId", as: "user" });
  Activity.hasMany(ExerciseSession, { foreignKey: "activityId" });
  ExerciseSession.belongsTo(Activity, { foreignKey: "activityId" });

  ActivityArea.hasMany(ActivitySubActivity, { foreignKey: "areaId", as: "subs", onDelete: "CASCADE" });
  ActivitySubActivity.belongsTo(ActivityArea, { foreignKey: "areaId", as: "area" });
}