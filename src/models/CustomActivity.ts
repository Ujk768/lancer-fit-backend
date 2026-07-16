// src/models/CustomActivity.ts
//
// A user-created "Other" activity. When someone logs an activity that isn't in
// the catalog (e.g. "Rock Climbing"), we persist it here so it (a) survives
// restarts, (b) can be reused, (c) can be pinned to the top of their Log screen,
// and (d) can be deleted. One row per (user, activity name).

import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/database";

export class CustomActivity extends Model {
  declare id: number;
  declare userId: number;
  declare key: string;   // slug, unique per user
  declare name: string;  // display name the user typed
  declare pinned: boolean;
  declare lastUsedAt: Date | null;
}

CustomActivity.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: {
      type: DataTypes.INTEGER, allowNull: false,
      references: { model: "users", key: "userId" }, onDelete: "CASCADE",
    },
    key: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    pinned: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    lastUsedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize, modelName: "custom_activity", tableName: "custom_activities",
    timestamps: true,
    indexes: [{ unique: true, fields: ["userId", "key"] }],
  },
);