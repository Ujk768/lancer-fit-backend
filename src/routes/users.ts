import { Router, Request, Response } from 'express';
import { User } from '../models';

const router = Router();

// GET /users
router.get('/', async (req: Request, res: Response) => {
  res.status(200).json({ message: 'getAllUsers - not implemented yet' });
});

// GET /users/:id
router.get('/:id', async (req: Request, res: Response) => {
  res.status(200).json({ message: 'getUser - not implemented yet' });
});

// POST /users
router.post('/', async (req: Request, res: Response) => {
  res.status(201).json({ message: 'createUser - not implemented yet' });
});

// PUT /users/:id
router.put('/:id', async (req: Request, res: Response) => {
  res.status(200).json({ message: 'User updated - not implemented yet' });
});

// DELETE /users/:id
router.delete('/:id', async (req: Request, res: Response) => {
  res.status(200).json({ message: 'deleteUser - not implemented yet' });
});

export default router;