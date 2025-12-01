import { Router } from 'express';
import {
  assignUserRoleController,
  listUsersController,
  inviteUserController,
  getUserController,
  updateUserController,
  deleteUserController,
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
 * POST /users/invite
 * Invite a user to an app
 */
router.post(
  '/invite',
  validateBody(userValidators.invite),
  inviteUserController
);

/**
 * GET /users/:userId
 * Get a user by ID
 */
router.get(
  '/:userId',
  validateParams(paramValidators.userId),
  getUserController
);

/**
 * PUT /users/:userId
 * Update a user
 */
router.put(
  '/:userId',
  validateParams(paramValidators.userId),
  validateBody(userValidators.update),
  updateUserController
);

/**
 * DELETE /users/:userId
 * Delete a user (superadmin only)
 */
router.delete(
  '/:userId',
  validateParams(paramValidators.userId),
  deleteUserController
);

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

