// One Expo push token per device. A user (or admin) can be signed in on more
// than one device, so tokens are keyed by the token string (unique) and carry
// the owner's id + role. When someone signs out or the token rotates we upsert
// / delete by token. The push sender (utils/push.ts) reads active tokens for a
// set of recipients and delivers OS-level notifications via Expo.

import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/database";

export class PushToken extends Model {
  declare id: number;
  declare ownerId: number;       // userId or adminId
  declare ownerRole: string;     // "student" | "admin"
  declare token: string;         // ExponentPushToken[...]
  declare platform: string | null; // "ios" | "android"
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

PushToken.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ownerId: { type: DataTypes.INTEGER, allowNull: false },
    ownerRole: { type: DataTypes.STRING, allowNull: false, defaultValue: "student" },
    token: { type: DataTypes.STRING, allowNull: false, unique: true },
    platform: { type: DataTypes.STRING, allowNull: true },
  },
  {
    sequelize,
    modelName: "pushToken",
    tableName: "push_tokens",
    timestamps: true,
  }
);