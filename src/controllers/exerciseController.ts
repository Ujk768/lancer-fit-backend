// src/controllers/exerciseController.ts
import { Request, Response } from "express";
import { sequelize } from "../config/database";
import { ExerciseSession } from "../models/ExerciseSession";
import { Activity } from "../models/Activity";
import { User } from "../models/User";
import { asyncHandler } from "../utils/asyncHandler";
import { serializeSession } from "../utils/serializers";
import { emit } from "../realtime/io";

export const logExercise = asyncHandler(async (req: Request, res: Response) => {
   console.log("LOG EXERCISE HIT2");
  const userId = req.user!.userId;
  const {
    exerciseKey, exerciseName, areaKey = null, activityId = null,
    quantity = 0, unit = "min", durationMin = 0, performedAt,
  } = req.body;

  if (!exerciseKey || !exerciseName) {
    return res.status(400).json({ success: false, message: "exerciseKey and exerciseName are required" });
  }
  if (durationMin <= 0 && quantity <= 0) {
    return res.status(400).json({ success: false, message: "Provide durationMin or quantity greater than 0" });
  }

  const t = await sequelize.transaction();
  try {
    let points = Math.round(durationMin); // default: 1 min = 1 point
    if (activityId) {
      const activity = await Activity.findByPk(activityId, { transaction: t });
      if (activity && quantity > 0) points = Math.round(quantity * activity.pointsPerUnit);
    }

    const session = await ExerciseSession.create(
      {
        userId, activityId, exerciseKey, exerciseName, areaKey,
        quantity, unit, durationMin, points,
        performedAt: performedAt ? new Date(performedAt) : new Date(),
      },
      { transaction: t },
    );

    await User.increment({ totalXp: points }, { where: { userId }, transaction: t });
    await t.commit();

    const payload = serializeSession(session);
    emit.toUser(userId, "exercise:logged", payload);
    emit.toAllAdmins("exercise:logged", { userId, ...payload });

    res.status(201).json({ success: true, session: payload, pointsEarned: points });
  } catch (err) {
    await t.rollback();
    throw err;
  }
});

export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const sessions = await ExerciseSession.findAll({
    where: { userId }, order: [["performedAt", "DESC"]], limit,
  });
  res.status(200).json({ success: true, sessions: sessions.map(serializeSession) });
});