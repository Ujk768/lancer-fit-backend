import { Router } from 'express';
import userRoutes from './users'; // if you move user routes to user.ts
import authRoutes from './authRoutes';

const router = Router();

// Mount separated route files
router.use('/users', userRoutes); // if you have src/routes/user.ts
router.use('/auth',authRoutes)


export default router;