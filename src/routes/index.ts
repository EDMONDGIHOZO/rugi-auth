import { Router } from 'express';
import authRoutes from './auth.routes';
import appRoutes from './app.routes';
import userRoutes from './user.routes';
import auditRoutes from './audit.routes';
import roleRoutes from "./role.routes";

const router = Router();

// Public authentication routes
router.use('/', authRoutes);

// Admin routes (require authentication)
router.use('/apps', appRoutes);
router.use('/users', userRoutes);
router.use('/audit', auditRoutes);
router.use("/roles", roleRoutes);

export default router;

