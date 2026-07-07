// src/models/RefreshToken.ts
import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/database";

export class RefreshToken extends Model {
  declare id: number;
  declare userId: number;
  declare token: string;      // could store a hash instead, see note below
  declare expiresAt: Date;
  declare revokedAt: Date | null;
}

RefreshToken.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    token: { type: DataTypes.STRING, allowNull: false, unique: true },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    revokedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    modelName: "refreshToken",
    tableName: "refresh_tokens",
    timestamps: true,
  }
);