// src/models/Badge.ts
import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export class Badge extends Model {
  declare badgeID: number;
  declare badgeName: string;
  declare badgeImage: string;
  declare badgeDescription: string;
}

Badge.init(
  {
    badgeID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, unique: true, field: 'badgeID' },
    badgeName: { type: DataTypes.STRING, allowNull: false },
    badgeImage: { type: DataTypes.STRING, allowNull: false },
    badgeDescription: { type: DataTypes.TEXT, allowNull: false },
  },
  { sequelize, modelName: 'badge', tableName: 'badges', timestamps: true, underscored: false }
);

export default Badge;