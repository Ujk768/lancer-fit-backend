// src/index.ts
import express, { Request, Response } from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { sequelize } from "./config/database";
import routes from "./routes";
import { defineAssociations } from "./models/associations";
import { errorHandler } from "./middleware/errorHandler";
import { initSocket } from "./realtime/io";
import { runSeed } from "./config/seed";

dotenv.config();

const CLIENT_ORIGINS = (process.env.CLIENT_ORIGINS || "http://localhost:5173")
  .split(",").map((o) => o.trim()).filter(Boolean);

const app = express();
app.use(cors({ origin: CLIENT_ORIGINS, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Hello from Lancer Fit Backend", api: "/api" });
});
app.use("/api", routes);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 8000;
const httpServer = http.createServer(app);
initSocket(httpServer, CLIENT_ORIGINS);

async function start() {
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully.");
    defineAssociations();
    await sequelize.sync({ alter: true });
    await runSeed();
    httpServer.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`REST API base: http://localhost:${PORT}/api`);
      console.log(`Socket.IO ready on the same port`);
    });
  } catch (err) {
    console.error("Unable to start server:", err);
  }
}
start();