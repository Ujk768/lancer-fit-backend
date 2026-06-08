import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// sequlize and set up database connection
export const sequelize = new Sequelize(
  process.env.DB_NAME || 'devdb',
  process.env.DB_USER || 'devuser',
  process.env.DB_PASSWORD || 'devpass',
  {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    dialect: 'postgres',
    logging: false,
  }
);