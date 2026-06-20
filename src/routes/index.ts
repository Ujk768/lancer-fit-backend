import { Router } from 'express';
import authRoutes from './authRoutes';
import challengeRoutes from './challengeRoutes';
import userRoutes from './userRoutes';
import badgeRoutes from './badgeRoutes';

const router = Router();

router.use('/challenge', challengeRoutes);
router.use('/auth',authRoutes)
router.use('/user',userRoutes)
router.use('/badges',badgeRoutes)


export default router;