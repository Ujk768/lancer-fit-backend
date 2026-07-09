// src/controllers/activityController.ts
import { Request, Response } from "express";
import { Activity } from "../models/Activity";
import { ActivityLog } from "../models/ActivityLog";
import { sequelize } from "../config/database";
import { User } from "../models/User";
import { asyncHandler } from "../utils/asyncHandler";

export const getAllActivities = asyncHandler(async (_req: Request, res: Response) => {
  const activities = await Activity.findAll({ order: [["activityName", "ASC"]] });
  res.status(200).json({ success: true, activities });
});

export const createActivity = asyncHandler(async (req: Request, res: Response) => {
  const { activityName, activityDescription, activityImage, units, pointsPerUnit } = req.body;
  if (!activityName?.trim() || !units?.trim()) {
    return res.status(400).json({ success: false, message: "activityName and units are required" });
  }
  const activity = await Activity.create({
    activityName: activityName.trim(),
    activityDescription: activityDescription ?? "",
    activityImage: activityImage ?? null,
    units: units.trim(),
    pointsPerUnit: Number(pointsPerUnit) || 0,
  });
  res.status(201).json({ success: true, activity });
});

export const awardActivityPoints = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const activityId = Number(req.params.activityId);
  const { unitsLogged } = req.body;
  if (unitsLogged == null || typeof unitsLogged !== "number" || unitsLogged <= 0) {
    return res.status(400).json({ success: false, message: "unitsLogged must be a positive number" });
  }
  const t = await sequelize.transaction();
  try {
    const activity = await Activity.findByPk(activityId, { transaction: t });
    if (!activity) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Activity not found" });
    }
    const pointsEarned = unitsLogged * activity.pointsPerUnit;
    const log = await ActivityLog.create(
      { userId, activityId, date: new Date(), unitsLogged, pointsPerUnit: activity.pointsPerUnit },
      { transaction: t },
    );
    await User.increment({ totalXp: pointsEarned }, { where: { userId }, transaction: t });
    await t.commit();
    res.status(201).json({ success: true, message: "Activity points awarded", log: { ...log.toJSON(), pointsEarned } });
  } catch (err) {
    await t.rollback();
    throw err;
  }
});