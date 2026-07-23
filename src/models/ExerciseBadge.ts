import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/database";

// Frequency/streak badges defined against the EXERCISE taxonomy (what the app
// actually logs via POST /api/exercise/log), as opposed to ActivityBadge which
// is keyed to the older Activity catalog. See docs/badge-system-implementation.md.

export enum ExerciseBadgeScope {
  EXERCISE = "exercise", // one specific catalog exercise (targetKey = exerciseKey)
  AREA = "area",         // any exercise in an area (targetKey = areaKey)
  ANY = "any",           // any exercise at all (targetKey = null)
}

export enum ExerciseBadgeMetric {
  FREQUENCY = "frequency", // lifetime count of qualifying sessions
  STREAK = "streak",       // consecutive days with a qualifying session
}

export class ExerciseBadge extends Model {
  declare id: number;
  declare badgeId: number;
  declare scope: string;
  declare targetKey: string | null;
  declare metric: string;
  declare tier: number;
  declare threshold: number;
}

ExerciseBadge.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    badgeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "badges", key: "badgeID" },
      onDelete: "CASCADE",
    },
    scope: { type: DataTypes.STRING, allowNull: false },
    targetKey: { type: DataTypes.STRING, allowNull: true },
    metric: { type: DataTypes.STRING, allowNull: false },
    tier: { type: DataTypes.INTEGER, allowNull: false },
    threshold: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    sequelize,
    modelName: "exercise_badge",
    tableName: "exercise_badges",
    timestamps: true,
    underscored: false,
    indexes: [{ unique: true, fields: ["scope", "targetKey", "metric", "tier"] }],
  },
);

export default ExerciseBadge;
