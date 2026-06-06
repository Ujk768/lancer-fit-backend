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
app.use(routes);

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Hello from Express + TypeScript + Sequelize' });
});

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');
    // await sequelize.sync({ force: false }); // optional in dev

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Unable to connect to the database:', err);
  }
}

start();