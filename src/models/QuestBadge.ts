import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/database";

export enum QuestBadgeMetric {
  FREQUENCY = "frequency",
  STREAK = "streak",
}

export enum QuestCompletionMode {
  ANY_ONE = "any_one",
  ALL_THREE = "all_three",
}

export class QuestBadge extends Model {
  declare id: number;
  declare badgeId: number;
  declare metric: string;
  declare completionMode: string;
  declare tier: number;
  declare threshold: number;
}

QuestBadge.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    badgeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "badges", key: "badgeID" },
      onDelete: "CASCADE",
    },
    metric: { type: DataTypes.STRING, allowNull: false },
    completionMode: { type: DataTypes.STRING, allowNull: false },
    tier: { type: DataTypes.INTEGER, allowNull: false },
    threshold: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    sequelize,
    modelName: "quest_badge",
    tableName: "quest_badges",
    timestamps: true,
    underscored: false,
    indexes: [{ unique: true, fields: ["metric", "completionMode", "tier"] }],
  },
);

export default QuestBadge;
