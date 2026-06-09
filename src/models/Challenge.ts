import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/database";

//A model is an abstraction that represents a table in your database.
//  it is a class that extends Model.
export class TLCChallenge extends Model {
  public challengeId!: number;
  public challengeName!: string;
  public challengeImage?: string;
  public challengeDescription!: string;
  public startDate!: Date;
  public endDate!: Date;
  public status!: string;
  public venue!: string;
  public instructorName!: string;
}

export class PersonalChallenge extends Model {
  public userId!: number;
  public challengeId!: number;
  public challengeName!: string;
  public challengeImage?: string;
  public challengeDescription!: string;
  public startDate!: Date;
  public endDate!: Date;
  public status!: string;
  public points!: number;
}

TLCChallenge.init(
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
  },
  {
    sequelize,
    modelName: "tlc_challenges",
    tableName: "tlc_challenges",
    timestamps: true,
    underscored: false,
  },
);

PersonalChallenge.init(
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
    points: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    // foreign key to User -> in one to many relationship with User - fk lives in many side
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    //   unique: true, // one personal challenge per user
      references: {
        model: "users",
        key: "userId",
      },
      onDelete: "CASCADE",
    },
  },
  {
    sequelize,
    modelName: "personal_challenge",
    tableName: "personal_challenges",
    timestamps: true,
    underscored: false,
  },
);
