import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

// flags, faculty, age, xp , dailycheckin, longest streak
// - daily check-in logic -> streak counter

export class User extends Model {
  declare userId: number;
  declare profileImage?: string;
  declare name: string;
  declare email: string;
  declare password: string;
  declare role: string;
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