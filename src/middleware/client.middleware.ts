import { Request, Response, NextFunction } from 'express';
import { verifyClientCredentials } from '../services/app.service';
import { AuthError } from '../utils/errors';

/**
 * Middleware to verify client credentials
 * Validates client_id and client_secret (for confidential apps)
 */
export function clientVerificationMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const clientId = req.body.client_id || req.query.client_id;

  if (!clientId) {
    throw new AuthError('client_id is required');
  }

  const clientSecret = req.body.client_secret || req.query.client_secret;

  // Verify credentials (will throw if invalid)
  verifyClientCredentials(clientId, clientSecret)
    .then((app) => {
      // Attach app info to request for use in controllers
      (req as any).clientApp = app;
      next();
    })
    .catch((error) => {
      next(error);
    });
}

