import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import  {sequelize}  from './config/database';
import routes from './routes';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// All routes under /users and /posts

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Hello from Express + TypeScript + Sequelize' });
});

app.use(routes);

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');
    // ensure models are synced (creates tables if they don't exist)
    await sequelize.sync({ alter: true });

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Unable to connect to the database:', err);
  }
}

start();