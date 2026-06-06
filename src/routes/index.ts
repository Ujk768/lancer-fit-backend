import { Router } from 'express';
import { getAllUsers, getUser, createUser, deleteUser } from '../controllers/userController';

const router = Router();

router.get('/', getAllUsers);
router.get('/:id', getUser);
router.post('/', createUser);
router.delete('/:id', deleteUser);

export default router;
