// src/controllers/customActivityController.ts
//
// Manage a user's own "Other" activities: list, create, pin/unpin, delete.
// These feed the Log screen's custom section. Logging one still goes through
// /exercise/log (which also upserts/touches the custom activity via ensureCustom).

import { Request, Response } from "express";
import { CustomActivity } from "../models/CustomActivity";
import { asyncHandler } from "../utils/asyncHandler";

const slugify = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function serialize(c: CustomActivity) {
  return { id: c.id, key: c.key, name: c.name, pinned: c.pinned, lastUsedAt: c.lastUsedAt };
}

// GET /api/custom-activity — the user's saved custom activities (pinned first)
export const listCustom = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const rows = await CustomActivity.findAll({
    where: { userId },
    order: [["pinned", "DESC"], ["lastUsedAt", "DESC"], ["createdAt", "DESC"]],
  });
  res.status(200).json({ success: true, activities: rows.map(serialize) });
});

// POST /api/custom-activity  body: { name }
export const createCustom = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: "Activity name is required." });
  const key = slugify(name);
  if (!key) return res.status(400).json({ message: "Please enter a valid activity name." });

  const [row] = await CustomActivity.findOrCreate({
    where: { userId, key },
    defaults: { userId, key, name: name.trim(), pinned: false, lastUsedAt: null },
  });
  res.status(201).json({ success: true, activity: serialize(row) });
});

// PATCH /api/custom-activity/:id/pin  body: { pinned }
export const setPinned = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const row = await CustomActivity.findOne({ where: { id: Number(req.params.id), userId } });
  if (!row) return res.status(404).json({ message: "That activity no longer exists." });
  row.pinned = !!req.body.pinned;
  await row.save();
  res.status(200).json({ success: true, activity: serialize(row) });
});

// DELETE /api/custom-activity/:id
export const deleteCustom = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const deleted = await CustomActivity.destroy({ where: { id: Number(req.params.id), userId } });
  if (!deleted) return res.status(404).json({ message: "That activity no longer exists." });
  res.status(200).json({ success: true });
});

// Called by exercise logging to remember a custom activity + bump lastUsedAt.
export async function ensureCustom(userId: number, name: string, key: string) {
  const [row] = await CustomActivity.findOrCreate({
    where: { userId, key },
    defaults: { userId, key, name, pinned: false, lastUsedAt: new Date() },
  });
  row.lastUsedAt = new Date();
  await row.save();
  return row;
}