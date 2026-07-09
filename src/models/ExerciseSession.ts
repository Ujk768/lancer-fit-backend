// src/models/ExerciseSession.ts
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class ExerciseSession extends Model {
  declare sessionId: number;
  declare userId: number;
  declare activityId: number | null;
  declare exerciseKey: string;
  declare exerciseName: string;
  declare areaKey: string | null;
  declare quantity: number;
  declare unit: string;
  declare durationMin: number;
  declare points: number;
  declare performedAt: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ExerciseSession.init(
  {
    sessionId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: {
      type: DataTypes.INTEGER, allowNull: false,
      references: { model: "users", key: "userId" }, onDelete: "CASCADE",
    },
    activityId: {
      type: DataTypes.INTEGER, allowNull: true,
      references: { model: "activities", key: "activityId" }, onDelete: "SET NULL",
    },
    exerciseKey: { type: DataTypes.STRING, allowNull: false },
    exerciseName: { type: DataTypes.STRING, allowNull: false },
    areaKey: { type: DataTypes.STRING, allowNull: true },
    quantity: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    unit: { type: DataTypes.STRING, allowNull: false, defaultValue: "min" },
    durationMin: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    points: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    performedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize, modelName: "exercise_session", tableName: "exercise_sessions",
    timestamps: true, underscored: false,
    indexes: [
      { fields: ["userId", "performedAt"] },
      { fields: ["userId", "exerciseKey", "performedAt"] },
    ],
  },
);