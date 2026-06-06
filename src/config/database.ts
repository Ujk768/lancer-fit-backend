import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

export const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'devdb',
  process.env.POSTGRES_USER || 'devuser',
  process.env.POSTGRES_PASSWORD || 'devpass',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT) || 5432,
    dialect: 'postgres',
    logging: false,
  }
);