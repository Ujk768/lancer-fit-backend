import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class Quest extends Model {
    declare questId: number;
    declare title: string;
    declare xp: number;
    declare category: string;
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
    xp: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "quests",
    tableName: "quests",
    timestamps: true,
    underscored: false,
  }
);
