import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import { sequelize } from "../config/database";

export class UserStats extends Model {
  declare statsId: number;

  declare userId: number;

  declare xp: number;
  declare currentStreak: number;
  declare longestStreak: number;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

UserStats.init(
  {
    statsId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },

    xp: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    currentStreak: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    longestStreak: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: "userStats",
    tableName: "user_stats",
    timestamps: true,
  },
);
