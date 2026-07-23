// src/controllers/activityController.ts
import { Request, Response, NextFunction } from "express";
import { Activity } from "../models/Activity";
import { ActivityLog } from "../models/ActivityLog";
import { ActivityBadge } from "../models/ActivityBadge";
import { sequelize } from "../config/database";
import { User } from "../models/User";
import { asyncHandler } from "../utils/asyncHandler";
import {
  ensureActivityBadges,
  evaluateActivityBadges,
  templateBadgeName,
  ActivityBadgeInput,
} from "../services/badges/activityBadges";
import { evaluateSpecialtyBadges } from "../services/badges/specialtyBadges";
import { FREQUENCY_TIERS, STREAK_TIERS } from "../services/badges/constants";

export const createActivity = async (req: Request, res: Response, next: NextFunction) => {
  const {
    activityName, activityDescription, units, pointsPerUnit, category, activityImage,
    magnitude, activityFrequency, activityStreak, categoryFrequency, categoryStreak, anyFrequency, anyStreak,
  } = req.body;

  if (!Array.isArray(magnitude) || magnitude.length !== 3 || magnitude.some((m: any) => typeof m?.threshold !== "number")) {
    return res.status(400).json({
      success: false,
      message: "magnitude must be an array of exactly 3 entries, each with a numeric threshold",
    });
  }

  const t = await sequelize.transaction();
  try {
    const activity = await Activity.create(
      { activityName, activityDescription, units, pointsPerUnit, category, activityImage },
      { transaction: t },
    );

    const badgeInput: ActivityBadgeInput = {
      // validated as exactly-3 above; TS can't see through that runtime check
      magnitude: magnitude as ActivityBadgeInput["magnitude"],
      activityFrequency, activityStreak, categoryFrequency, categoryStreak, anyFrequency, anyStreak,
    };
    await ensureActivityBadges(activity, badgeInput, t);

    await t.commit();
    res.status(201).json({ success: true, message: 'Activity created', activity });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// GET /api/activity/badge-template?activityName=<string>&category=<string>
// Read-only preview of the badges creating this activity would trigger, so an
// admin UI can render editable fields pre-filled with template defaults
// before the activity actually exists. See docs/badge-system-spec.md §C.3.
export const getActivityBadgeTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activityName = (req.query.activityName as string) || "";
    const category = (req.query.category as string) || "";

    const buildTiers = (metric: "frequency" | "streak", label: string, tiers: number[]) =>
      tiers.map((threshold, i) => ({
        tier: i + 1,
        threshold,
        name: templateBadgeName(metric, i + 1, label),
        image: null as string | null,
      }));

    const categoryIsNew = category
      ? (await ActivityBadge.count({ where: { scope: "category", category } })) === 0
      : true;
    const anyIsNew = (await ActivityBadge.count({ where: { scope: "any" } })) === 0;

    res.status(200).json({
      activityFrequency: buildTiers("frequency", activityName, FREQUENCY_TIERS),
      activityStreak: buildTiers("streak", activityName, STREAK_TIERS),
      categoryIsNew,
      categoryFrequency: categoryIsNew ? buildTiers("frequency", category, FREQUENCY_TIERS) : null,
      categoryStreak: categoryIsNew ? buildTiers("streak", category, STREAK_TIERS) : null,
      anyIsNew,
      anyFrequency: anyIsNew ? buildTiers("frequency", "Any Activity", FREQUENCY_TIERS) : null,
      anyStreak: anyIsNew ? buildTiers("streak", "Any Activity", STREAK_TIERS) : null,
    });
  } catch (err) {
    next(err);
  }
};

export const awardActivityPoints = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { activityid } = req.params; // matches route's :activityid
  const { unitsLogged } = req.body;

  if (unitsLogged == null || typeof unitsLogged !== "number" || unitsLogged <= 0) {
    return res.status(400).json({
      success: false,
      message: "unitsLogged must be a positive number",
    });
  }

  const t = await sequelize.transaction();
  try {
    const activity = await Activity.findByPk(activityid as string, { transaction: t });

    if (!activity) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Activity not found" });
    }
    const pointsEarned = unitsLogged * activity.pointsPerUnit;
    const log = await ActivityLog.create(
      {
        userId,
        activityId: activityid,
        date: new Date(),
        unitsLogged,
        pointsPerUnit: activity.pointsPerUnit, // snapshot at log time
      },
      { transaction: t },
    );
    await User.increment({ totalXp: pointsEarned }, { where: { userId }, transaction: t });

    await evaluateActivityBadges(userId, activity, log, t);
    await evaluateSpecialtyBadges(userId, log.date, t);

    await t.commit();
    res.status(201).json({ success: true, message: "Activity points awarded", log: { ...log.toJSON(), pointsEarned } });
  } catch (err) {
    await t.rollback();
    throw err;
  }
});

export const getAllActivities = async(req:Request,res:Response,next:NextFunction)=>{
  try{
    const activities = await Activity.findAll();
    return res.status(200).json({
      success:true,
      activities
    })
  }catch(err){
    next(err)
  }
}