import { Request, Response, NextFunction } from "express";
import { Quest } from "../models/Quests";

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

export const getRandomQuests = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const quests = await Quest.findAll();
    //randomly select 3 quests
    const randomQuests = quests.sort(() => 0.5 - Math.random()).slice(0, 3);
    res.status(200).json({ success: true, quests: randomQuests });
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
    const { id } = req.params;
    const { title, description, points } = req.body;
    const quest = await Quest.findByPk(id as string);
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
    const { id } = req.params;
    const quest = await Quest.findByPk(id as string);
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
    const { title, description, points } = req.body;
    const quest = await Quest.create({ title, description, points });
    res.status(201).json({ success: true, quest });
  } catch (err) {
    next(err);
  }
};
