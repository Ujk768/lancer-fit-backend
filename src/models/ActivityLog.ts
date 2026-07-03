import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class ActivityLog extends Model {
  declare id: number;
  declare userId: number;
  declare activityId: number;
  declare date: Date;
  declare unitsLogged: number;
  declare pointsPerUnit: number; // snapshot of Activity.pointsPerUnit at log time

  // convenience getter, not a DB column
  get pointsEarned(): number {
    return this.unitsLogged * this.pointsPerUnit;
  }
}

ActivityLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "userId",
      },
      onDelete: "CASCADE",
    },
    activityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "activities",
        key: "activityId",
      },
      onDelete: "CASCADE",
    },
    date: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    unitsLogged: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    pointsPerUnit: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    sequelize,
    modelName: "activity_logs",
    tableName: "activity_logs",
    timestamps: true,
    underscored: false,
  },
);