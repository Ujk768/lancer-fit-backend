// src/models/Badge.ts
import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export enum BadgeType {
  CHALLENGE_POSITION = 'challenge_position',
  ACTIVITY_FREQUENCY = 'activity_frequency',
  ACTIVITY_MAGNITUDE = 'activity_magnitude',
  ACTIVITY_STREAK = 'activity_streak',
  QUEST_FREQUENCY = 'quest_frequency',
  QUEST_STREAK = 'quest_streak',
  EXERCISE_FREQUENCY = 'exercise_frequency',
  EXERCISE_STREAK = 'exercise_streak',
  SPECIALTY = 'specialty',
}

export class Badge extends Model {
  declare badgeID: number;
  declare badgeName: string;
  declare badgeImage: string | null;
  declare badgeDescription: string;
  declare awardXpValue: number;
  declare secret: boolean;
  declare badgeType: string;
}

Badge.init(
  {
    badgeID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, unique: true, field: 'badgeID' },
    badgeName: { type: DataTypes.STRING, allowNull: false },
    badgeImage: { type: DataTypes.STRING, allowNull: true }, // TODO before full release: require a real image (see docs/badge-system-spec.md "Tracked for later")
    badgeDescription: { type: DataTypes.TEXT, allowNull: false },
    awardXpValue: { type: DataTypes.INTEGER, allowNull: false },
    secret: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    badgeType: { type: DataTypes.STRING, allowNull: false },
  },
  { sequelize, modelName: 'badge', tableName: 'badges', timestamps: true, underscored: false }
);

export default Badge;