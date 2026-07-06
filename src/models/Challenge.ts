import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/database";

//A model is an abstraction that represents a table in your database.
//  it is a class that extends Model.

// status - active,
export class Challenge extends Model {
  public challengeId!: number;
  public challengeName!: string;
  public challengeImage?: string;
  public challengeDescription!: string;
  public startDate!: Date;
  public endDate!: Date;
  public status!: string; // active/ completed
  public venue!: string;
  public instructorName!: string;
  public challengeUnit!: string; // e.g pushups / lap
  public pointsPerUnit!: number; // points per pushup / lap
}

/***
 *
 * Daily Quests -> 3 everyday / pool of 50
 * - randomly add / remove
 * - name
 * - description
 *  - date
 *
 *
 */

// Also called Other Activity (+ button)
/**
 * units per challenge
 * points per challenge
 * new field called other
 * activity will be created by admin and points will be set by admin
 * other will be another type of activity creaetd by user and you get 1 point per minute
 */

Challenge.init(
  {
    challengeId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    challengeName: { type: DataTypes.STRING, allowNull: false },
    challengeImage: { type: DataTypes.STRING, allowNull: true },
    challengeDescription: { type: DataTypes.TEXT, allowNull: false },
    startDate: { type: DataTypes.DATE, allowNull: false },
    endDate: { type: DataTypes.DATE, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false },
    venue: { type: DataTypes.STRING, allowNull: false },
    instructorName: { type: DataTypes.STRING, allowNull: false },
    challengeUnit: { type: DataTypes.STRING, allowNull: false },
    pointsPerUnit: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    sequelize,
    modelName: "challenges",
    tableName: "challenges",
    timestamps: true,
    underscored: false,
  },
);
