import { Request, Response, NextFunction } from 'express';
import { createApp, findAppById } from '../services/app.service';
import { assignUserRole } from '../services/role.service';
import { prisma } from '../config/database';
import { AuditAction } from '@prisma/client';

/**
 * Register a new client application
 */
export async function createAppController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const app = await createApp(req.body);
    res.status(201).json({
      message: 'Application created successfully',
      app,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create or assign a role for an app
 */
export async function assignAppRoleController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { appId } = req.params;
    const { role_name } = req.body;

    // Verify app exists
    await findAppById(appId);

    // Find or create role
    const { findOrCreateRole } = await import('../services/role.service');
    const role = await findOrCreateRole(role_name);

    res.json({
      message: 'Role created/verified successfully',
      role: {
        id: role.id,
        name: role.name,
      },
    });
  } catch (error) {
    next(error);
  }
}

