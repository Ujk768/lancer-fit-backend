import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export class TLCChallengeParticipant extends Model {
  public participantId!: number;
  public userId!: number;
  public challengeId!: number;
  public points!: number;
  public rank!: number | null;
}

TLCChallengeParticipant.init(
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
        model: 'users',
        key: 'userId',
      },
      onDelete: 'CASCADE',
    },
    challengeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tlc_challenges',
        key: 'challengeId',
      },
      onDelete: 'CASCADE',
    },
    points: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    rank: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'tlc_challenge_participant',
    tableName: 'tlc_challenge_participants',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'challengeId'],
      },
    ],
    underscored: false,
  }
);