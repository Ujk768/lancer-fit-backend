import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/database";

export class ChallengeParticipant extends Model {
  declare participantId: number;
  declare userId: number;
  declare challengeId: number;
  declare status: string; // pending / approved
  declare submitted_at: Date;
  declare reviewed_at: Date;
  declare reviewed_by: string;
  declare pointsSubmitted: number; // these are user points that they enter to be verified
  declare pointsAwarded: number; // these are user points that they enter to be verified
}

ChallengeParticipant.init(
  {
    participantId: {
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
    challengeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "challenges",
        key: "challengeId",
      },
      onDelete: "CASCADE",
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "pending",
    },
    submitted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reviewed_by: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pointsSubmitted: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    pointsAwarded: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: "challenge_participant",
    tableName: "challenge_participants",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["userId", "challengeId"],
      },
    ],
    underscored: false,
  },
);
