import { Request, Response } from 'express';
import { User } from '../models/User';

export const getAllUsers = async (_req: Request, res: Response) => {
  const users = await User.findAll();
  res.json(users);
};

export const getUser = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const user = await User.findByPk(id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
};

export const createUser = async (req: Request, res: Response) => {
  const { name, email } = req.body;
  const user = await User.create({ name, email });
  res.status(201).json(user);
};

export const deleteUser = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const result = await User.destroy({ where: { id } });
  if (result && result > 0) return res.json({ message: 'Deleted' });
  return res.status(404).json({ message: 'User not found' });
};
