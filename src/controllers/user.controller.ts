import { Request, Response, NextFunction } from 'express';
import { assignUserRole } from '../services/role.service';
import { prisma } from '../config/database';
import { AuditAction } from '@prisma/client';

/**
 * Assign a role to a user for a specific app
 */
export async function assignUserRoleController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req.params;
    const { app_id, role_name } = req.body;

    // Get current user (assigned_by) if authenticated
    const assignedBy = req.user?.userId;

    const userAppRole = await assignUserRole(
      userId,
      app_id,
      role_name,
      assignedBy
    );

    // Audit log
    await prisma.authAudit.create({
      data: {
        userId,
        action: AuditAction.ROLE_ASSIGN,
        metadata: {
          app_id,
          role_name,
          assigned_by: assignedBy,
        },
      },
    });

    res.status(201).json({
      message: 'Role assigned successfully',
      userAppRole: {
        id: userAppRole.id,
        user: userAppRole.user,
        app: userAppRole.app,
        role: userAppRole.role,
        assigned_at: userAppRole.assignedAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

