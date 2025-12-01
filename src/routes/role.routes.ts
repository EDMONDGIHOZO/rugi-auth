import { Router } from 'express';
import { listRolesController } from '../controllers/role.controller';
import { validateQuery } from '../middleware/validation.middleware';
import { roleValidators } from '../utils/validators';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All role routes require authentication
router.use(authMiddleware);

/**
 * GET /roles
 * List roles with optional search and pagination
 */
router.get('/', validateQuery(roleValidators.list), listRolesController);

export default router;


