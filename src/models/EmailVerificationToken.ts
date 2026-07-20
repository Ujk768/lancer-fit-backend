import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/database";

export class EmailVerificationToken extends Model {
  declare id: number;
  declare userId: number;
  declare codeHash: string;
  declare expiresAt: Date;
  declare usedAt: Date | null;
}

EmailVerificationToken.init(
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
    modelName: "emailVerificationToken",
    tableName: "email_verification_tokens",
    timestamps: true,

    indexes: [
      {
        fields: ["userId"],
      },
    ],
  },
);
