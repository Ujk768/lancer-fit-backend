import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/database";

export class SpecialtyBadge extends Model {
  declare id: number;
  declare badgeId: number;
  declare ruleKey: string;
}

SpecialtyBadge.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    badgeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: { model: "badges", key: "badgeID" },
      onDelete: "CASCADE",
    },
    ruleKey: { type: DataTypes.STRING, allowNull: false },
  },
  {
    sequelize,
    modelName: "specialty_badge",
    tableName: "specialty_badges",
    timestamps: true,
    underscored: false,
  },
);

export default SpecialtyBadge;
