import { Request, Response, NextFunction } from "express";
import { Quest } from "../models/Quests";
import { success } from "zod";

export const getAllQuests = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const quests = await Quest.findAll();
    res.status(200).json({ success: true, quests });
  } catch (err) {
    next(err);
  }
};

export const activateQuest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { questId } = req.params;
    const quest = await Quest.findByPk(questId as string);
    if (!quest) {
      return res
        .status(404)
        .json({ success: false, message: "Quest not found" });
    }
    quest.isActive = true;
    await quest.save();
    return res.status(200).json({
      success: true,
      data: quest,
      message: "Quest Active",
    });
  } catch (err) {
    next(err);
  }
};

export const editQuest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { questId } = req.params;
    const { title, description, points } = req.body;
    const quest = await Quest.findByPk(questId as string);
    if (!quest) {
      return res
        .status(404)
        .json({ success: false, message: "Quest not found" });
    }
    await quest.update({ title, description, points });
    res.status(200).json({ success: true, quest });
  } catch (err) {
    next(err);
  }
};

export const deleteQuest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { questId } = req.params;
    const quest = await Quest.findByPk(questId as string);
    if (!quest) {
      return res
        .status(404)
        .json({ success: false, message: "Quest not found" });
    }
    await quest.destroy();
    res
      .status(200)
      .json({ success: true, message: "Quest deleted successfully" });
  } catch (err) {
    next(err);
  }
};

export const addQuest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { title, description, points, category } = req.body;
    const quest = await Quest.create({ title, description, points, category });
    res.status(201).json({ success: true, quest });
  } catch (err) {
    next(err);
  }
};

export const getActiveQuests = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const quests = await Quest.findAll({
      where: {
        isActive: true,
      },
    });
    res.status(200).json({
      success: true,
      quests,
    });
  } catch (err) {
    next(err);
  }
};

export const deactivateQuest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { questId } = req.params;
    const quest = await Quest.findByPk(questId as string);
    if (!quest) {
      return res
        .status(404)
        .json({ success: false, message: "Quest not found" });
    }
    quest.isActive = false;
    await quest.save();
    return res.status(200).json({
      success: true,
      data: quest,
      message: "Quest DeActivated",
    });
  } catch (err) {
    next(err);
  }
};
