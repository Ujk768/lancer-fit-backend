import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { sequelize } from "./config/database";
import routes from "./routes";
import { defineAssociations } from "./models/associations";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

const app = express();
app.use(cors({
  origin: 'http://localhost:5173', // your Vite dev server's actual port
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'] // only if you actually need cookies
}    ));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// All routes under /users and /posts

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Hello from Lancer Fit Backend" });
});

app.use(routes);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully.");
    // ensure models are synced (creates tables if they don't exist)
    defineAssociations();
    await sequelize.sync({ alter: true  });

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Unable to connect to the database:", err);
  }
}

start();