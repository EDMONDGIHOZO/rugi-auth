import { Router } from "express";
import {
  getAuthSettingsController,
  createAuthSettingsController,
  updateAuthSettingsController,
  deleteAuthSettingsController,
  listAuthSettingsController,
  checkAuthMethodController,
} from "../controllers/auth-settings.controller";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validation.middleware";
import { authSettingsValidators, paramValidators } from "../utils/validators";
import { authMiddleware } from "../middleware/auth.middleware";
import { superAdminMiddleware } from "../middleware/superadmin.middleware";

const router = Router();

// All auth settings routes require authentication
router.use(authMiddleware);

/**
 * GET /auth-settings
 * List all authentication settings (superadmin only)
 */
router.get(
  "/",
  superAdminMiddleware,
  validateQuery(authSettingsValidators.list),
  listAuthSettingsController
);

/**
 * GET /apps/:appId/auth-settings
 * Get authentication settings for a specific app
 */
router.get(
  "/apps/:appId",
  validateParams(paramValidators.appId),
  getAuthSettingsController
);

/**
 * POST /apps/:appId/auth-settings
 * Create authentication settings for an app (superadmin only)
 */
router.post(
  "/apps/:appId",
  superAdminMiddleware,
  validateParams(paramValidators.appId),
  validateBody(authSettingsValidators.create),
  createAuthSettingsController
);

/**
 * PATCH /apps/:appId/auth-settings
 * Update authentication settings for an app (superadmin only)
 */
router.patch(
  "/apps/:appId",
  superAdminMiddleware,
  validateParams(paramValidators.appId),
  validateBody(authSettingsValidators.update),
  updateAuthSettingsController
);

/**
 * DELETE /apps/:appId/auth-settings
 * Delete authentication settings for an app (superadmin only)
 */
router.delete(
  "/apps/:appId",
  superAdminMiddleware,
  validateParams(paramValidators.appId),
  deleteAuthSettingsController
);

/**
 * GET /apps/:appId/auth-settings/check/:method
 * Check if a specific auth method is enabled for an app
 */
router.get(
  "/apps/:appId/check/:method",
  validateParams(paramValidators.authMethod),
  checkAuthMethodController
);

export default router;
