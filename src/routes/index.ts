import { Router } from 'express';
import userRoutes from './users'; // if you move user routes to user.ts

const router = Router();

// Mount separated route files
router.use('/users', userRoutes); // if you have src/routes/user.ts


export default router;