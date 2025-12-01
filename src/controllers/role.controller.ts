import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

/**
 * List roles with optional search and pagination
 */
export async function listRolesController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { search, page = 1, limit = 100 } = req.query as {
      search?: string;
      page?: number;
      limit?: number;
    };

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: Prisma.RoleWhereInput = {};

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [roles, total] = await Promise.all([
      prisma.role.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: {
          userAppRoles: true,
        },
      }),
      prisma.role.count({ where }),
    ]);

    res.json({
      data: roles.map((role) => ({
        id: role.id,
        name: role.name,
        usageCount: role.userAppRoles.length,
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


