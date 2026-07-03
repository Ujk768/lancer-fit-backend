import { Router } from 'express';
import authRoutes from './authRoutes';
import challengeRoutes from './challengeRoutes';
import userRoutes from './userRoutes';
import badgeRoutes from './badgeRoutes';
import activityRoutes from "./activityRoutes";
import questRoutes from "./questRoutes";
const router = Router();

router.use('/challenge', challengeRoutes);
router.use('/auth',authRoutes)
router.use('/user',userRoutes)
router.use('/badge',badgeRoutes)
router.use('/activity',activityRoutes)
router.use('/quest',questRoutes)


export default router;