import { Router, Request, Response } from 'express';
import { Post } from '../models';

const router = Router();

// GET /posts
router.get('/', async (req: Request, res: Response) => {
  const posts = await Post.findAll({ include: [] }); // add associations later if needed
  res.json(posts);
});

// GET /posts/:id
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const post = await Post.findByPk(id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json(post);
});

// POST /posts
router.post('/', async (req: Request, res: Response) => {
  const { title, content, userId } = req.body;
  const post = await Post.create({ title, content, userId });
  res.status(201).json(post);
});

// PUT /posts/:id
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, content } = req.body;
  const post = await Post.findByPk(id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  await post.update({ title, content });
  res.json(post);
});

// DELETE /posts/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const post = await Post.findByPk(id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  await post.destroy();
  res.status(204).send();
});

export default router;