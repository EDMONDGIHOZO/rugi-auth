import { Router } from 'express';
import {
  initiateGoogleOAuth,
  handleGoogleCallback,
  getAvailableProviders,
} from '../controllers/oauth.controller';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import { oauthValidators } from '../utils/validators';

const router = Router();

/**
 * GET /oauth/providers
 * Get available OAuth providers for an app
 */
router.get(
  '/providers',
  validateQuery(oauthValidators.getProviders),
  getAvailableProviders
);

/**
 * GET /oauth/google
 * Initiate Google OAuth flow
 */
router.get(
  '/google',
  validateQuery(oauthValidators.initiateOAuth),
  initiateGoogleOAuth
);

/**
 * POST /oauth/google/callback
 * Handle Google OAuth callback
 */
router.post(
  '/google/callback',
  validateBody(oauthValidators.oauthCallback),
  handleGoogleCallback
);

export default router;

