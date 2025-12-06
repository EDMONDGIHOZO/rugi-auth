import { Router } from "express";
import {
  getEmailConfigController,
  createEmailConfigController,
  updateEmailConfigController,
  deleteEmailConfigController,
} from "../controllers/email-config.controller";
import {
  validateBody,
  validateParams,
} from "../middleware/validation.middleware";
import { paramValidators, emailConfigValidators } from "../utils/validators";
import { authMiddleware } from "../middleware/auth.middleware";
import { superAdminMiddleware } from "../middleware/superadmin.middleware";

const router = Router();

// All email settings routes require authentication
router.use(authMiddleware);

/**
 * GET /settings/email/:appId
 * Get email configuration for an app (superadmin only)
 */
router.get(
  "/email/:appId",
  superAdminMiddleware,
  validateParams(paramValidators.appId),
  getEmailConfigController
);

/**
 * POST /settings/email/:appId
 * Create email configuration for an app (superadmin only)
 */
router.post(
  "/email/:appId",
  superAdminMiddleware,
  validateParams(paramValidators.appId),
  validateBody(emailConfigValidators.create),
  createEmailConfigController
);

/**
 * PATCH /settings/email/:appId
 * Update email configuration for an app (superadmin only)
 */
router.patch(
  "/email/:appId",
  superAdminMiddleware,
  validateParams(paramValidators.appId),
  validateBody(emailConfigValidators.update),
  updateEmailConfigController
);

/**
 * DELETE /settings/email/:appId
 * Delete email configuration for an app (superadmin only)
 */
router.delete(
  "/email/:appId",
  superAdminMiddleware,
  validateParams(paramValidators.appId),
  deleteEmailConfigController
);

export default router;

