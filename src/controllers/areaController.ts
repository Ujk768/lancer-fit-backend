// src/controllers/areaController.ts
import { Request, Response } from "express";
import { ActivityArea } from "../models/ActivityArea";
import { ActivitySubActivity } from "../models/ActivitySubActivity";
import { asyncHandler } from "../utils/asyncHandler";
import { serializeArea, serializeSubActivity } from "../utils/serializers";
import { emit } from "../realtime/io";
import { generateExerciseBadgesFor } from "../services/badges/exerciseBadges";
import { ExerciseBadgeScope } from "../models/ExerciseBadge";

const slugify = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const listAreas = asyncHandler(async (_req: Request, res: Response) => {
  const areas = await ActivityArea.findAll({
    include: [{ model: ActivitySubActivity, as: "subs" }],
    order: [["areaId", "ASC"]],
  });
  res.status(200).json({ success: true, areas: areas.map((a) => serializeArea(a as any)) });
});

export const addArea = asyncHandler(async (req: Request, res: Response) => {
  const { name, icon, accent } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: "Area name is required." });
  const key = slugify(name);
  const exists = await ActivityArea.findOne({ where: { key } });
  if (exists) return res.status(409).json({ message: "An area with that name already exists." });
  const area = await ActivityArea.create({ key, name: name.trim(), icon: icon || null, accent: accent || null });
  await generateExerciseBadgesFor(ExerciseBadgeScope.AREA, area.key, area.name);
  emit.toAllStudents("areas:updated", { areaId: area.areaId });
  res.status(201).json({ success: true, area: serializeArea(area as any) });
});

export const removeArea = asyncHandler(async (req: Request, res: Response) => {
  const deleted = await ActivityArea.destroy({ where: { areaId: Number(req.params.id) } });
  if (!deleted) return res.status(404).json({ message: "That area no longer exists." });
  emit.toAllStudents("areas:updated", { areaId: Number(req.params.id) });
  res.status(200).json({ success: true });
});

export const addSubActivity = asyncHandler(async (req: Request, res: Response) => {
  const areaId = Number(req.params.id);
  const { name, icon, hint, promotedFromOther } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: "Activity name is required." });
  const area = await ActivityArea.findByPk(areaId);
  if (!area) return res.status(404).json({ message: "That area no longer exists." });
  const key = slugify(name);
  const dup = await ActivitySubActivity.findOne({ where: { areaId, key } });
  if (dup) return res.status(409).json({ message: "That activity already exists in this area." });
  const sub = await ActivitySubActivity.create({
    areaId, key, name: name.trim(), icon: icon || null, hint: hint || null,
    promotedFromOther: !!promotedFromOther,
  });
  await generateExerciseBadgesFor(ExerciseBadgeScope.EXERCISE, sub.key, sub.name);
  emit.toAllStudents("areas:updated", { areaId });
  res.status(201).json({ success: true, activity: serializeSubActivity(sub) });
});

export const removeSubActivity = asyncHandler(async (req: Request, res: Response) => {
  const areaId = Number(req.params.id);
  const deleted = await ActivitySubActivity.destroy({ where: { areaId, subId: Number(req.params.subId) } });
  if (!deleted) return res.status(404).json({ message: "That activity no longer exists." });
  emit.toAllStudents("areas:updated", { areaId });
  res.status(200).json({ success: true });
});