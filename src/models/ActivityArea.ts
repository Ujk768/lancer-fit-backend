// src/models/ActivityArea.ts
import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/database";

export class ActivityArea extends Model {
  declare areaId: number;
  declare key: string;
  declare name: string;
  declare icon: string;
  declare accent: string;
}

ActivityArea.init(
  {
    areaId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    key: { type: DataTypes.STRING, allowNull: false, unique: true },
    name: { type: DataTypes.STRING, allowNull: false },
    icon: { type: DataTypes.STRING, allowNull: true },
    accent: { type: DataTypes.STRING, allowNull: true },
  },
  {
    sequelize, modelName: "activity_area",
    tableName: "activity_areas", timestamps: true,
  },
);