import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/database";

// flags, faculty, age->dob, xp , dailycheckin, longest streak
// - daily check-in logic -> streak counter

export enum UserRole {
  STUDENT = "student",
  ADMIN = "admin",
}

export enum Faculty {
  ARTS_HUMANITIES_SOCIAL_SCIENCES = "Faculty of Arts, Humanities and Social Sciences",
  EDUCATION = "Faculty of Education",
  ENGINEERING = "Faculty of Engineering",
  GRADUATE_STUDIES = "Faculty of Graduate Studies",
  HUMAN_KINETICS = "Faculty of Human Kinetics",
  LAW = "Faculty of Law",
  NURSING = "Faculty of Nursing",
  ODETTE_BUSINESS = "Odette School of Business",
  SCIENCE = "Faculty of Science",
  ADMIN = "Admin",
}

export class User extends Model {
  declare userId: number;
  declare firstName: string;
  declare lastName: string;
  declare name: string;
  declare email: string;
  declare password: string;
  declare role: string;
  declare nationality: string;
  declare faculty: string;
  declare totalXp: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

User.init(
  {
    userId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      unique: true,
      field: "userId",
    },

    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: { type: DataTypes.STRING, allowNull: false },

    faculty: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    nationality: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: UserRole.STUDENT,
    },
    totalXp: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    }
  },
  {
    sequelize,
    modelName: "user",
    tableName: "users",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["email"],
      },
    ],
  },
);
