import {Request, Response, NextFunction} from 'express';
import {assignUserRole} from '../services/role.service';
import {
    inviteUser,
    findUserById,
    updateUser,
    deleteUser,
} from '../services/user.service';
import {prisma} from '../config/database';
import {AuditAction} from '@prisma/client';

/**
 * Assign a role to a user for a specific app
 */
export async function assignUserRoleController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const {userId} = req.params;
        const {app_id, role_name} = req.body;

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
                "action": AuditAction.ROLE_ASSIGN,
                "metadata": {
                    app_id,
                    role_name,
                    "assigned_by": assignedBy,
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
        const {search, page = 1, limit = 20} = req.query as {
            search?: string;
            page?: number;
            limit?: number;
        };

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const where: any = {};

        if (search) {
            where.email = {contains: search, mode: 'insensitive'};
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take,
                orderBy: {createdAt: 'desc'},
            }),
            prisma.user.count({where}),
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

/**
 * Invite a user to one or more apps
 */
export async function inviteUserController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const {email, app_ids} = req.body;

        const result = await inviteUser({email, app_ids});

        const appCount = result.apps.length;
        const message = result.is_new_user 
            ? `User invited and created successfully with access to ${appCount} app(s)` 
            : `User invited to ${appCount} app(s) successfully`;

        res.status(201).json({
            message,
            user: {
                id: result.id,
                email: result.email,
                is_new_user: result.is_new_user,
                generated_password: result.generated_password,
                apps: result.apps,
                role: result.role,
                opted_in_apps: result.opted_in_apps,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get a user by ID
 */
export async function getUserController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const {userId} = req.params;

        const user = await findUserById(userId);

        res.json({
            user: {
                id: user.id,
                email: user.email,
                isEmailVerified: user.isEmailVerified,
                mfaEnabled: user.mfaEnabled,
                optedInApps: user.optedInApps,
                createdAt: user.createdAt,
                roles: user.userAppRoles.map((uar) => ({
                    role: uar.role.name,
                    app: {
                        id: uar.app.id,
                        name: uar.app.name,
                        clientId: uar.app.clientId,
                    },
                    assignedAt: uar.assignedAt,
                })),
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Update a user
 */
export async function updateUserController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const {userId} = req.params;
        const {email, password, isEmailVerified, mfaEnabled, app_id} = req.body;
        const requestingUserId = req.user!.userId;

        const updatedUser = await updateUser(
            userId,
            {email, password, isEmailVerified, mfaEnabled},
            requestingUserId,
            app_id
        );

        res.json({
            message: 'User updated successfully',
            user: updatedUser,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Delete a user
 */
export async function deleteUserController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const {userId} = req.params;
        const requestingUserId = req.user!.userId;

        const result = await deleteUser(userId, requestingUserId);

        res.json(result);
    } catch (error) {
        next(error);
    }
}

