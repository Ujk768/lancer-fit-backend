// src/models/DailyQuestOverride.ts
import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/database";

export class DailyQuestOverride extends Model {
  declare id: number;
  declare dateKey: string; // "YYYY-MM-DD"
  declare questIds: number[]; // JSON array of Quest.questId
}

DailyQuestOverride.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    dateKey: { type: DataTypes.STRING, allowNull: false, unique: true },
    questIds: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  },
  {
    sequelize, modelName: "daily_quest_override",
    tableName: "daily_quest_overrides", timestamps: true,
  },
);