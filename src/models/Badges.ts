// src/models/Badge.ts
import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export class Badge extends Model {
  declare badgeID: number;
  declare badgeName: string;
  declare badgeImage: string;
  declare badgeDescription: string;
  declare completionCriteria: number;
  declare awardXpValue: number;
  declare secret: boolean;     
}

Badge.init(
  {
    badgeID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, unique: true, field: 'badgeID' },
    badgeName: { type: DataTypes.STRING, allowNull: false },
    badgeImage: { type: DataTypes.STRING, allowNull: false },
    badgeDescription: { type: DataTypes.TEXT, allowNull: false },
    completionCriteria: { type: DataTypes.INTEGER, allowNull: false },
    awardXpValue: { type: DataTypes.INTEGER, allowNull: false },
    secret: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { sequelize, modelName: 'badge', tableName: 'badges', timestamps: true, underscored: false }
);

export default Badge;