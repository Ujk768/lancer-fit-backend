import 'reflect-metadata';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { User } from '../models/User';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lancer_fit_db',
  synchronize: true,
  logging: false,
  entities: [User],
  migrations: [],
  subscribers: [],
});
