import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export class User extends Model {
  public userId!: number;
  public profileImage?: string;
  public name!: string;
  public email!: string;
  public password!: string;
  public role: string = 'student'; // default role#
}

User.init(
  {
    userId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, unique: true , field: 'userId'},
    profileImage: { type: DataTypes.STRING, allowNull: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: false, defaultValue: 'student' },
  },
  { sequelize, modelName: 'user', tableName: 'users', timestamps: true, underscored: false }
);