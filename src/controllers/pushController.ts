// Device push-token registration. The mobile app calls POST /api/push/register
// on sign-in (and whenever the Expo token rotates) with its ExponentPushToken.
// We upsert it against the signed-in owner so the push sender can later target
// "all admins", "all students", or one user. DELETE /api/push/register removes a
// token on sign-out so a shared device stops receiving another account's pushes.

import { Request, Response } from "express";
import { PushToken } from "../models/PushToken";
import { asyncHandler } from "../utils/asyncHandler";

export const registerPushToken = asyncHandler(async (req: Request, res: Response) => {
  const { token, platform } = req.body as { token?: string; platform?: string };
  if (!token || !token.startsWith("ExponentPushToken")) {
    return res.status(400).json({ success: false, message: "A valid Expo push token is required" });
  }
  const ownerId = req.user!.userId;
  const ownerRole = req.user!.role === "admin" ? "admin" : "student";

  // Upsert by unique token: if this device already registered (possibly to a
  // different account), reassign it to the current owner.
  const existing = await PushToken.findOne({ where: { token } });
  if (existing) {
    existing.ownerId = ownerId;
    existing.ownerRole = ownerRole;
    existing.platform = platform ?? existing.platform ?? null;
    await existing.save();
  } else {
    await PushToken.create({ ownerId, ownerRole, token, platform: platform ?? null });
  }

  res.status(200).json({ success: true });
});

export const unregisterPushToken = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body as { token?: string };
  if (!token) return res.status(400).json({ success: false, message: "token is required" });
  await PushToken.destroy({ where: { token } });
  res.status(200).json({ success: true });
});