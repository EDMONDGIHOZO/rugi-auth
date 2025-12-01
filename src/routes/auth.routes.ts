import { Router } from "express";
import Joi from "joi";
import {
  registerController,
  loginController,
  refreshController,
  revokeController,
  meController,
  requestPasswordResetController,
  resetPasswordController,
  verifyResetTokenController,
  requestOTPController,
  verifyOTPController,
} from "../controllers/auth.controller";
import { validateBody } from "../middleware/validation.middleware";
import { authValidators } from "../utils/validators";
import { authRateLimiter } from "../middleware/rateLimit.middleware";
import { authMiddleware } from "../middleware/auth.middleware";
import { getPublicKey } from "../config/keys";
import * as pemJwk from "pem-jwk";

const router = Router();

/**
 * POST /register
 * Register a new user
 */
router.post(
  "/register",
  authRateLimiter,
  validateBody(authValidators.register),
  registerController
);

/**
 * POST /login
 * Login user and receive tokens
 */
router.post(
  "/login",
  authRateLimiter,
  validateBody(authValidators.login),
  loginController
);

/**
 * POST /refresh
 * Refresh access token using refresh token
 */
router.post(
  "/refresh",
  authRateLimiter,
  validateBody(authValidators.refresh),
  refreshController
);

/**
 * POST /revoke
 * Revoke a refresh token
 */
router.post("/revoke", validateBody(authValidators.revoke), revokeController);

/**
 * GET /.well-known/jwks.json
 * Public key endpoint in JWKS format
 */
router.get("/.well-known/jwks.json", (_req, res) => {
  try {
    const publicKey = getPublicKey();

    // Convert PEM to JWK format
    const jwk = pemJwk.pem2jwk(publicKey);

    // Add JWKS metadata
    const jwks = {
      keys: [
        {
          ...jwk,
          use: "sig",
          alg: "RS256",
          kid: "1", // Key ID (should be unique per key, can be derived from key hash)
        },
      ],
    };

    res.json(jwks);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate JWKS" });
  }
});

/**
 * GET /me
 * Get current user information (requires authentication)
 */
router.get("/me", authMiddleware, meController);

/**
 * POST /password-reset/request
 * Request a password reset email
 */
router.post(
  "/password-reset/request",
  authRateLimiter,
  validateBody(authValidators.requestPasswordReset),
  requestPasswordResetController
);

/**
 * POST /password-reset/verify
 * Verify if a reset code is valid
 */
router.post(
  "/password-reset/verify",
  validateBody(
    Joi.object({
      token: Joi.string()
        .pattern(/^\d+$/)
        .length(6)
        .required(),
    })
  ),
  verifyResetTokenController
);

/**
 * POST /password-reset/reset
 * Reset password using token
 */
router.post(
  "/password-reset/reset",
  authRateLimiter,
  validateBody(authValidators.resetPassword),
  resetPasswordController
);

/**
 * POST /otp/request
 * Request OTP for email login
 */
router.post(
  "/otp/request",
  authRateLimiter,
  validateBody(authValidators.requestOTP),
  requestOTPController
);

/**
 * POST /otp/verify
 * Verify OTP and login
 */
router.post(
  "/otp/verify",
  authRateLimiter,
  validateBody(authValidators.verifyOTP),
  verifyOTPController
);

export default router;
