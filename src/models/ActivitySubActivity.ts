// src/models/ActivitySubActivity.ts
import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/database";

export class ActivitySubActivity extends Model {
  declare subId: number;
  declare areaId: number;
  declare key: string;
  declare name: string;
  declare icon: string;
  declare hint: string | null;
  declare promotedFromOther: boolean;
}

ActivitySubActivity.init(
  {
    subId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    areaId: {
      type: DataTypes.INTEGER, allowNull: false,
      references: { model: "activity_areas", key: "areaId" },
      onDelete: "CASCADE",
    },
    key: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    icon: { type: DataTypes.STRING, allowNull: true },
    hint: { type: DataTypes.STRING, allowNull: true },
    promotedFromOther: {
      type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false,
    },
  },
  {
    sequelize, modelName: "activity_sub_activity",
    tableName: "activity_sub_activities", timestamps: true,
    indexes: [{ unique: true, fields: ["areaId", "key"] }],
  },
);