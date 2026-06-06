import { Request, Response } from 'express';
import { User } from '../models/User';

export const getAllUsers = async (req: Request, res: Response) => {
  res.status(200).json({ message: 'getAllUsers - not implemented yet' });
};

export const getUser = async (req: Request, res: Response) => {
 res.status(200).json({ message: 'getUser - not implemented yet' });
};

export const createUser = async (req: Request, res: Response) => {
  res.status(201).json({ message: 'createUser - not implemented yet' });
};

export const deleteUser = async (req: Request, res: Response) => {
  res.status(200).json({ message: 'deleteUser - not implemented yet' });
};
