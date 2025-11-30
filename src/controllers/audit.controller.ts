import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuditAction } from '@prisma/client';

/**
 * List audit logs with filtering and pagination
 */
export async function listAuditController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const {
      user_id,
      action,
      page = 1,
      limit = 20,
      start_date,
      end_date,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // Build where clause
    const where: any = {};

    if (user_id) {
      where.userId = user_id as string;
    }

    if (action) {
      where.action = action as AuditAction;
    }

    if (start_date || end_date) {
      where.createdAt = {};
      if (start_date) {
        where.createdAt.gte = new Date(start_date as string);
      }
      if (end_date) {
        where.createdAt.lte = new Date(end_date as string);
      }
    }

    // Fetch audit logs
    const [auditLogs, total] = await Promise.all([
      prisma.authAudit.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      }),
      prisma.authAudit.count({ where }),
    ]);

    res.json({
      data: auditLogs,
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

