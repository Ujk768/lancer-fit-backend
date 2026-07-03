import { Request, Response , NextFunction} from "express";
import { Activity } from "../models/Activity";

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

// // ── PATCH /challenges/personal/:challengeId/complete ─────────────
// export const completeActivity = async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { userId } = req.user!;
//     const { challengeId } = req.params;
//     const { points } = req.body;

//     const challenge = await Activity.findOne({
//       where: { challengeId, userId },
//     });

//     if (!challenge) {
//       return res.status(404).json({ message: 'Challenge not found or unauthorized' });
//     }

//     if (challenge.status === 'completed') {
//       return res.status(400).json({ message: 'Challenge already completed' });
//     }

//     await challenge.update({ status: 'completed', points: points || 0 });

//     res.status(200).json({ success: true, message: 'Challenge marked as completed', challenge });
//   } catch (err) {
//     next(err);
//   }
// };

// // ── POST /challenges/personal/:challengeId/claim-points ──────────
// // This fills your empty placeholder function cleanly!
// export const addActivityPoints = async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { userId } = req.user!;
//     const { challengeId } = req.params;
//     const { pointsToAdd } = req.body; // Expecting increment value e.g., { "pointsToAdd": 15 }

//     if (!pointsToAdd || pointsToAdd <= 0) {
//       return res.status(400).json({ message: 'Please provide valid positive points to add.' });
//     }

//     const challenge = await Activity.findOne({
//       where: { challengeId, userId }
//     });

//     if (!challenge) {
//       return res.status(404).json({ message: 'Personal challenge not found' });
//     }

//     // Increment points safely on the instance
//     const updatedPoints = challenge.points + Number(pointsToAdd);
//     await challenge.update({ points: updatedPoints });

//     res.status(200).json({
//       success: true,
//       message: `${pointsToAdd} points added successfully!`,
//       currentTotal: updatedPoints
//     });
//   } catch (err) {
//     next(err);
//   }
// };

// // ── GET /challenges/personal/me ──────────────────────────────────
// export const getUserActivitys = async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { userId } = req.user!;

//     const challenges = await Activity.findAll({
//       where: { userId },
//       order: [['createdAt', 'DESC']],
//     });

//     const total = challenges.reduce((sum, c) => sum + c.pointsPerUnit * c.unitsPerChallenge, 0);

//     res.status(200).json({
//       challenges,
//       totalPoints: total,
//     });
//   } catch (err) {
//     next(err);
//   }
// };
