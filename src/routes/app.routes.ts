import { Router } from 'express';
import {
  createAppController,
  assignAppRoleController,
} from '../controllers/app.controller';
import { validateBody, validateParams } from '../middleware/validation.middleware';
import { appValidators, paramValidators } from '../utils/validators';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All app routes require authentication
router.use(authMiddleware);

/**
 * POST /apps
 * Register a new client application
 */
router.post(
  '/',
  validateBody(appValidators.createApp),
  createAppController
);

/**
 * POST /apps/:appId/roles
 * Create or assign a role for an app
 */
router.post(
  '/:appId/roles',
  validateParams(paramValidators.appId),
  validateBody(appValidators.assignRole),
  assignAppRoleController
);

export default router;

