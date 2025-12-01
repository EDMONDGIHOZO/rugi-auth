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

/**
 * List users with optional search and pagination
 */
export async function listUsersController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { search, page = 1, limit = 20 } = req.query as {
      search?: string;
      page?: number;
      limit?: number;
    };

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};

    if (search) {
      where.email = { contains: search, mode: 'insensitive' };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      data: users.map((user) => ({
        id: user.id,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        mfaEnabled: user.mfaEnabled,
        createdAt: user.createdAt,
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
}

