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
      references: { model: 'badges', key: 'badgeID' },
      // Deleting a Badge removes its award rows too. The application layer
      // (deleteBadge's two-step confirm) decides whether a delete is allowed;
      // this just handles cleanup once one proceeds. XP is not clawed back.
      onDelete: 'CASCADE',
    },
  },
  {
    sequelize,
    modelName: 'userBadge',
    tableName: 'user_badges',
    timestamps: true, // Tracks exactly WHEN they earned the badge!
    underscored: false,
    indexes: [{ unique: true, fields: ['userId', 'badgeID'] }],
  }
);

export default UserBadge;