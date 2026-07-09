// src/models/Admin.ts
import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/database";

export enum AdminRole {
  ADMINISTRATOR = "Administrator",
  TLC_STAFF = "TLC Staff",
}

export class Admin extends Model {
  declare adminId: number;
  declare name: string;
  declare email: string;
  declare password: string;
  declare role: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Admin.init(
  {
    adminId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: {
      type: DataTypes.STRING, allowNull: false, unique: true,
      validate: { isEmail: true },
    },
    password: { type: DataTypes.STRING, allowNull: false },
    role: {
      type: DataTypes.STRING, allowNull: false,
      defaultValue: AdminRole.TLC_STAFF,
    },
  },
  {
    sequelize, modelName: "admin", tableName: "admins", timestamps: true,
    indexes: [{ unique: true, fields: ["email"] }],
  },
);