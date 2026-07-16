// src/models/Challenge.ts
import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/database";

export class Challenge extends Model {
  declare challengeId: number;
  declare challengeName: string;
  declare challengeImage?: string;
  declare challengeDescription: string;
  declare startDate: Date;
  declare endDate: Date;
  declare status: string;
  declare venue: string;
  declare instructorName: string;
  declare challengeUnit: string;
  declare pointsPerUnit: number;
  declare category: string;
  // ── Admin-dashboard fields (added) ──
  declare type: string;
  declare goal: number;
  declare xpReward: number;
  declare podiumFirst: number;
  declare podiumSecond: number;
  declare podiumThird: number;
  declare requiresValidation: boolean;
  declare createdBy: string;
  declare participantsCount: number;
}

Challenge.init(
  {
    challengeId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    challengeName: { type: DataTypes.STRING, allowNull: false },
    challengeImage: { type: DataTypes.STRING, allowNull: true },
    challengeDescription: { type: DataTypes.TEXT, allowNull: false },
    startDate: { type: DataTypes.DATE, allowNull: false },
    endDate: { type: DataTypes.DATE, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "active" },
    venue: { type: DataTypes.STRING, allowNull: true },
    instructorName: { type: DataTypes.STRING, allowNull: true },
    challengeUnit: { type: DataTypes.STRING, allowNull: false },
    pointsPerUnit: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    category: { type: DataTypes.STRING, allowNull: true },
    type: { type: DataTypes.STRING, allowNull: true },
    goal: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    xpReward: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    podiumFirst: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 500 },
    podiumSecond: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 300 },
    podiumThird: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 150 },
    requiresValidation: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    createdBy: { type: DataTypes.STRING, allowNull: true },
    participantsCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    sequelize, modelName: "challenges", tableName: "challenges",
    timestamps: true, underscored: false,
  },
);