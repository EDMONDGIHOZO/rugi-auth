import {Router} from 'express';
import {
    createAppController,
    assignAppRoleController,
    listAppsController, deleteAppController,
} from '../controllers/app.controller';
import {
    validateBody,
    validateParams,
    validateQuery,
} from '../middleware/validation.middleware';
import {appValidators, paramValidators} from '../utils/validators';
import {authMiddleware} from '../middleware/auth.middleware';

const router = Router();

// All app routes require authentication
router.use(authMiddleware);

/**
 * GET /apps
 * List applications with optional search and pagination
 */
router.get('/', validateQuery(appValidators.list), listAppsController);
router.delete('/:appId', validateParams(paramValidators.appId), deleteAppController);

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

