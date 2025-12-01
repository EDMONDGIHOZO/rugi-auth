import { Router } from 'express';
import {
  assignUserRoleController,
  listUsersController,
} from '../controllers/user.controller';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../middleware/validation.middleware';
import { userValidators, paramValidators } from '../utils/validators';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

/**
 * GET /users
 * List users with optional search and pagination
 */
router.get('/', validateQuery(userValidators.list), listUsersController);

/**
 * POST /users/:userId/roles
 * Assign a role to a user for a specific app
 */
router.post(
  '/:userId/roles',
  validateParams(paramValidators.userId),
  validateBody(userValidators.assignRole),
  assignUserRoleController
);

export default router;

