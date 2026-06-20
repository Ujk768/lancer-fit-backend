import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export class UserBadge extends Model {
  public id!: number;
  public userId!: number;
  public badgeID!: number;
}

UserBadge.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'userId' },
    },
    badgeID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'badges', key: 'badgeID' }, // matches your badgeId field
    },
  },
  {
    sequelize,
    modelName: 'userBadge',
    tableName: 'user_badges',
    timestamps: true, // Tracks exactly WHEN they earned the badge!
    underscored: false,
  }
);

export default UserBadge;