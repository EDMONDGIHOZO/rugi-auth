import {Request, Response, NextFunction} from "express";
import {createApp, updateApp, deleteAppById, findAppById, getAppUsers} from "../services/app.service";
import {prisma} from "../config/database";

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
            message: "Application created successfully",
            app,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * List applications with optional search and pagination
 */
export async function listAppsController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const {
            search,
            page = 1,
            limit = 20,
        } = req.query as {
            search?: string;
            page?: number;
            limit?: number;
        };

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const where: any = {};

        if (search) {
            where.OR = [
                {name: {contains: search, mode: "insensitive"}},
                {clientId: {contains: search, mode: "insensitive"}},
            ];
        }

        const [apps, total] = await Promise.all([
            prisma.app.findMany({
                where,
                skip,
                take,
                orderBy: {createdAt: "desc"},
            }),
            prisma.app.count({where}),
        ]);

        res.json({
            data: apps.map((app) => ({
                id: app.id,
                name: app.name,
                client_id: app.clientId,
                type: app.type,
                redirect_uris: app.redirectUris,
                created_at: app.createdAt,
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
 * Update an app by ID
 */
export async function updateAppController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const {appId} = req.params;
        const updatedApp = await updateApp(appId, req.body);
        res.json({
            message: "Application updated successfully",
            data: updatedApp,
        });
    } catch (error) {
        next(error);
    }
}

export async function deleteAppController(req: Request, res: Response, next: NextFunction) {
    const {appId} = req.params;
    try {
        if (appId) {
            const app = await findAppById(appId);
            if (app) {
                const deleted = await deleteAppById(appId);
                res.json({
                    message: 'Deleted successfully',
                    data: deleted
                })
            }
        }
    } catch (e) {
        next(e);
    }
}

/**
 * Get an app by ID
 */
export async function getAppController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const {appId} = req.params;

        const app = await findAppById(appId);

        res.json({
            id: app.id,
            name: app.name,
            client_id: app.clientId,
            type: app.type,
            redirect_uris: app.redirectUris,
            created_at: app.createdAt,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get all users of an app
 */
export async function getAppUsersController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const {appId} = req.params;
        const {page = 1, limit = 20} = req.query as {
            page?: number;
            limit?: number;
        };

        const result = await getAppUsers(appId, Number(page), Number(limit));

        res.json(result);
    } catch (error) {
        next(error);
    }
}

/**
 * Get all roles for an app
 */
export async function getAppRolesController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const {appId} = req.params;

        // Verify app exists
        const app = await findAppById(appId);

        // Get all roles for this app
        const roles = await prisma.role.findMany({
            where: {appId},
            include: {
                userAppRoles: true,
            },
            orderBy: {name: 'asc'},
        });

        const rolesWithCounts = roles.map((role) => ({
            id: role.id,
            name: role.name,
            userCount: role.userAppRoles.length,
            createdAt: role.createdAt,
        }));

        res.json({
            app: {
                id: app.id,
                name: app.name,
            },
            roles: rolesWithCounts,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Create a role for an app
 */
export async function assignAppRoleController(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const {appId} = req.params;
        const {role_name} = req.body;

        // Verify app exists
        await findAppById(appId);

        // Find or create role for this app
        const {findOrCreateRole} = await import("../services/role.service");
        const role = await findOrCreateRole(appId, role_name);

        res.json({
            message: "Role created/verified successfully",
            role: {
                id: role.id,
                name: role.name,
                appId: role.appId,
                createdAt: role.createdAt,
            },
        });
    } catch (error) {
        next(error);
    }
}
