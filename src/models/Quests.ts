import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class Quest extends Model {
  declare questId: number;
  declare title: string;
  declare description: string;
  declare points: number;
  declare category: string;
  declare isActive: boolean;
}


Quest.init(
  {
    questId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    points: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isActive:{
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  },
  {
    sequelize,
    modelName: "quests",
    tableName: "quests",
    timestamps: true,
    underscored: false,
  },
);