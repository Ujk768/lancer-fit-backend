import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class Activity extends Model {
  declare activityId: number;
  declare activityName: string;
  declare activityImage?: string;
  declare activityDescription: string;
  declare units: string;          // label, e.g. "km", "reps"
  declare pointsPerUnit: number;  // current/default rate
}

Activity.init(
  {
    activityId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    activityName: { type: DataTypes.STRING, allowNull: false },
    activityImage: { type: DataTypes.STRING, allowNull: true },
    activityDescription: { type: DataTypes.TEXT, allowNull: false },
    units: { type: DataTypes.STRING, allowNull: false },
    pointsPerUnit: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    sequelize,
    modelName: "activities",
    tableName: "activities",
    timestamps: true,
    underscored: false,
  },
);