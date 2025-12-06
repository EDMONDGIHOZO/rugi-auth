import {Router} from 'express';
import {
    createAppController,
    updateAppController,
    assignAppRoleController,
    getAppRolesController,
    listAppsController,
    deleteAppController,
    getAppController,
    getAppUsersController,
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
 * GET /apps/:appId
 * Get an app by ID
 */
router.get(
    '/:appId',
    validateParams(paramValidators.appId),
    getAppController
);

/**
 * PUT /apps/:appId
 * Update an app by ID
 */
router.put(
    '/:appId',
    validateParams(paramValidators.appId),
    validateBody(appValidators.updateApp),
    updateAppController
);

/**
 * DELETE /apps/:appId
 * Delete an app by ID
 */
router.delete(
    '/:appId',
    validateParams(paramValidators.appId),
    deleteAppController
);

/**
 * GET /apps/:appId/users
 * Get all users of an app
 */
router.get(
    '/:appId/users',
    validateParams(paramValidators.appId),
    validateQuery(appValidators.list),
    getAppUsersController
);

/**
 * GET /apps/:appId/roles
 * Get all roles used in an app
 */
router.get(
    '/:appId/roles',
    validateParams(paramValidators.appId),
    getAppRolesController
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

