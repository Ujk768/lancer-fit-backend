import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/database";

export class PasswordResetToken extends Model {
  declare id: number;
  declare userId: number;
  declare codeHash: string;
  declare expiresAt: Date;
  declare usedAt: Date | null;
}

PasswordResetToken.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    codeHash: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    usedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "passwordResetToken",
    tableName: "password_reset_tokens",
    timestamps: true,
    indexes: [
      {
        fields: ["userId"],
      },
    ],
  },
);
