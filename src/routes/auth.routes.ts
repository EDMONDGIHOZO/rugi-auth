import { Router } from "express";
import {
  registerController,
  loginController,
  refreshController,
  revokeController,
  meController,
} from "../controllers/auth.controller";
import { validateBody } from "../middleware/validation.middleware";
import { authValidators } from "../utils/validators";
import { authRateLimiter } from "../middleware/rateLimit.middleware";
import { authMiddleware } from "../middleware/auth.middleware";
import { getPublicKey } from "../config/keys";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pem2jwk = require("pem-jwk");

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
router.get("/.well-known/jwks.json", (req, res) => {
  try {
    const publicKey = getPublicKey();

    // Convert PEM to JWK format
    const jwk = pem2jwk.pem2jwk(publicKey);

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

export default router;
