import {Request, Response, NextFunction} from "express";
import {createApp, deleteAppById, findAppById} from "../services/app.service";
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
 * Create or assign a role for an app
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

        // Find or create role
        const {findOrCreateRole} = await import("../services/role.service");
        const role = await findOrCreateRole(role_name);

        res.json({
            message: "Role created/verified successfully",
            role: {
                id: role.id,
                name: role.name,
            },
        });
    } catch (error) {
        next(error);
    }
}
