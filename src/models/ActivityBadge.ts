import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/database";

export enum ActivityBadgeScope {
  ACTIVITY = "activity",
  CATEGORY = "category",
  ANY = "any",
}

export enum ActivityBadgeMetric {
  FREQUENCY = "frequency",
  MAGNITUDE = "magnitude",
  STREAK = "streak",
}

export class ActivityBadge extends Model {
  declare id: number;
  declare badgeId: number;
  declare scope: string;
  declare activityId: number | null;
  declare category: string | null;
  declare metric: string;
  declare tier: number;
  declare threshold: number;
}

ActivityBadge.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    badgeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "badges", key: "badgeID" },
      onDelete: "CASCADE",
    },
    scope: { type: DataTypes.STRING, allowNull: false },
    activityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "activities", key: "activityId" },
    },
    category: { type: DataTypes.STRING, allowNull: true },
    metric: { type: DataTypes.STRING, allowNull: false },
    tier: { type: DataTypes.INTEGER, allowNull: false },
    threshold: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    sequelize,
    modelName: "activity_badge",
    tableName: "activity_badges",
    timestamps: true,
    underscored: false,
    indexes: [
      { unique: true, fields: ["scope", "activityId", "category", "metric", "tier"] },
    ],
  },
);

export default ActivityBadge;
