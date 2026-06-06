import { Router, Request, Response } from 'express';
import { User } from '../models';

const router = Router();

// GET /users
router.get('/', async (req: Request, res: Response) => {
  const users = await User.findAll();
  res.json(users);
});

// GET /users/:id
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await User.findByPk(id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// POST /users
router.post('/', async (req: Request, res: Response) => {
  const { name, email } = req.body;
  const user = await User.create({ name, email });
  res.status(201).json(user);
});

// PUT /users/:id
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email } = req.body;
  const user = await User.findByPk(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  await user.update({ name, email });
  res.json(user);
});

// DELETE /users/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await User.findByPk(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  await user.destroy();
  res.status(204).send();
});

export default router;