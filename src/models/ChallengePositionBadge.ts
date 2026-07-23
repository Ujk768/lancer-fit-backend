import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/database";

export enum ChallengePosition {
  GOLD = "gold",
  SILVER = "silver",
  BRONZE = "bronze",
  PARTICIPANT = "participant",
}

export class ChallengePositionBadge extends Model {
  declare id: number;
  declare badgeId: number;
  declare challengeId: number;
  declare position: string;
}

ChallengePositionBadge.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    badgeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "badges", key: "badgeID" },
      onDelete: "CASCADE",
    },
    challengeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "challenges", key: "challengeId" },
      onDelete: "CASCADE",
    },
    position: { type: DataTypes.STRING, allowNull: false },
  },
  {
    sequelize,
    modelName: "challenge_position_badge",
    tableName: "challenge_position_badges",
    timestamps: true,
    underscored: false,
    indexes: [{ unique: true, fields: ["challengeId", "position"] }],
  },
);

export default ChallengePositionBadge;
