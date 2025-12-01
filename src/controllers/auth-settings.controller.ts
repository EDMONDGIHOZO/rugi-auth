import { Request, Response, NextFunction } from 'express';
import {
  getAuthSettings,
  createAuthSettings,
  updateAuthSettings,
  deleteAuthSettings,
  listAuthSettings,
  isAuthMethodEnabled,
} from '../services/auth-settings.service';

/**
 * Get authentication settings for an app
 * GET /apps/:appId/auth-settings
 */
export async function getAuthSettingsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { appId } = req.params;
    const settings = await getAuthSettings(appId);
    res.json(settings);
  } catch (error) {
    next(error);
  }
}

/**
 * Create authentication settings for an app
 * POST /apps/:appId/auth-settings
 */
export async function createAuthSettingsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { appId } = req.params;
    const settings = await createAuthSettings(appId, req.body);
    res.status(201).json({
      message: 'Authentication settings created successfully',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update authentication settings for an app
 * PATCH /apps/:appId/auth-settings
 */
export async function updateAuthSettingsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { appId } = req.params;
    const settings = await updateAuthSettings(appId, req.body);
    res.json({
      message: 'Authentication settings updated successfully',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete authentication settings for an app
 * DELETE /apps/:appId/auth-settings
 */
export async function deleteAuthSettingsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { appId } = req.params;
    await deleteAuthSettings(appId);
    res.json({
      message: 'Authentication settings deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List all authentication settings
 * GET /auth-settings
 */
export async function listAuthSettingsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { page = 1, limit = 20 } = req.query as {
      page?: number;
      limit?: number;
    };

    const result = await listAuthSettings(Number(page), Number(limit));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Check if a specific auth method is enabled for an app
 * GET /apps/:appId/auth-settings/check/:method
 */
export async function checkAuthMethodController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { appId, method } = req.params;

    const validMethods = [
      'email_password',
      'email_otp',
      'google',
      'github',
      'microsoft',
      'facebook',
    ];

    if (!validMethods.includes(method)) {
      return res.status(400).json({
        error: 'Invalid authentication method',
        valid_methods: validMethods,
      });
    }

    const isEnabled = await isAuthMethodEnabled(
      appId,
      method as 'email_password' | 'email_otp' | 'google' | 'github' | 'microsoft' | 'facebook'
    );

    res.json({
      app_id: appId,
      method,
      enabled: isEnabled,
    });
  } catch (error) {
    next(error);
  }
}

