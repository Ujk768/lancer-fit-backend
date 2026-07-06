import { Request, Response , NextFunction} from "express";
import { Activity } from "../models/Activity";
import { ActivityLog } from "../models/ActivityLog";
import { sequelize } from "../config/database";
import { User } from "../models/User";

// - POST /activity/create

export const createActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user!;
    const { ActivityName, ActivityDescription, startDate, endDate, unitsPerChallenge, pointsPerUnit } = req.body;

    const challenge = await Activity.create({
      userId,
      ActivityName,
      ActivityDescription,
      startDate,
      endDate,
      status: 'active',
      unitsPerChallenge,
      pointsPerUnit,
    });

    res.status(201).json({ success: true, message: 'Personal challenge created', challenge });
  } catch (err) {
    next(err);
  }
};

export const awardActivityPoints = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const t = await sequelize.transaction();

  try {
    const userId = req.user!.userId;
    const { activityId, unitsLogged } = req.body;

    if (unitsLogged == null || typeof unitsLogged !== "number" || unitsLogged <= 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "unitsLogged must be a positive number",
      });
    }

    const activity = await Activity.findByPk(activityId, { transaction: t });

    if (!activity) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Activity not found" });
    }

    if (activity.pointsPerUnit == null) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Activity has no pointsPerUnit configured",
      });
    }

    const pointsEarned = unitsLogged * activity.pointsPerUnit;

    const log = await ActivityLog.create(
      {
        userId,
        activityId,
        date: new Date(),
        unitsLogged,
        pointsPerUnit: activity.pointsPerUnit, // snapshot at log time
      },
      { transaction: t },
    );

    await User.increment(
      { totalXp: pointsEarned },
      { where: { userId }, transaction: t },
    );

    await t.commit();

    res.status(201).json({
      success: true,
      message: "Activity points awarded",
      log: {
        ...log.toJSON(),
        pointsEarned,
      },
    });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};