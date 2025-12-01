import {v4 as uuidv4} from 'uuid';
import {prisma} from '../config/database';
import {hashPassword} from './password.service';
import {NotFoundError, AuthError} from '../utils/errors';
import {AppType} from '@prisma/client';

export interface CreateAppInput {
    name: string;
    type: 'PUBLIC' | 'CONFIDENTIAL';
    redirect_uris: string[];
}

export interface UpdateAppInput {
    name?: string;
    type?: 'PUBLIC' | 'CONFIDENTIAL';
    redirect_uris?: string[];
}

export interface AppWithSecret {
    id: string;
    name: string;
    client_id: string;
    client_secret: string;
    type: AppType;
    redirect_uris: string[];
    created_at: Date;
}

/**
 * Create a new client application
 * Returns the app with client_secret (only shown once)
 */
export async function createApp(input: CreateAppInput): Promise<AppWithSecret> {
    const clientId = uuidv4();
    const clientSecret = uuidv4() + uuidv4(); // 64-character secret

    let clientSecretHash: string | null = null;
    if (input.type === 'CONFIDENTIAL') {
        clientSecretHash = await hashPassword(clientSecret);
    }

    const app = await prisma.app.create({
        data: {
            name: input.name,
            clientId,
            clientSecretHash,
            type: input.type as AppType,
            redirectUris: input.redirect_uris,
        },
    });

    return {
        id: app.id,
        name: app.name,
        client_id: app.clientId,
        client_secret: clientSecret,
        type: app.type,
        redirect_uris: app.redirectUris as string[],
        created_at: app.createdAt,
    };
}

/**
 * Find an app by client_id
 */
export async function findAppByClientId(clientId: string) {
    const app = await prisma.app.findUnique({
        where: {clientId},
    });

    if (!app) {
        throw new NotFoundError('Application not found');
    }

    return app;
}

/**
 * Find an app by ID
 */
export async function findAppById(appId: string) {
    const app = await prisma.app.findUnique({
        where: {id: appId},
    });

    if (!app) {
        throw new NotFoundError('Application not found');
    }
    return app;
}

/**
 * Update an app by ID
 */
export async function updateApp(appId: string, input: UpdateAppInput) {
    // Verify app exists
    const currentApp = await findAppById(appId);

    // Check if transitioning from PUBLIC to CONFIDENTIAL
    const isTransitioningToConfidential = 
        input.type === 'CONFIDENTIAL' && 
        currentApp.type === 'PUBLIC';

    // Build update data
    const updateData: any = {};
    let newClientSecret: string | null = null;

    if (input.name !== undefined) {
        updateData.name = input.name;
    }

    if (input.type !== undefined) {
        updateData.type = input.type as AppType;

        // Generate client secret if transitioning to CONFIDENTIAL
        if (isTransitioningToConfidential) {
            newClientSecret = uuidv4() + uuidv4(); // 64-character secret
            updateData.clientSecretHash = await hashPassword(newClientSecret);
        }
    }

    if (input.redirect_uris !== undefined) {
        updateData.redirectUris = input.redirect_uris;
    }

    const app = await prisma.app.update({
        where: {id: appId},
        data: updateData,
    });

    // If transitioned to CONFIDENTIAL, email the secret to app owner(s)
    if (isTransitioningToConfidential && newClientSecret) {
        // Find app owners (users with 'owner' role for this app)
        const owners = await prisma.userAppRole.findMany({
            where: {
                appId: app.id,
                role: {
                    name: 'owner'
                }
            },
            include: {
                user: {
                    select: {
                        email: true,
                    }
                }
            }
        });

        // Send email to all owners
        const { sendClientSecretEmail, isEmailServiceAvailable } = await import('./email.service');
        
        if (isEmailServiceAvailable()) {
            for (const owner of owners) {
                try {
                    await sendClientSecretEmail(
                        owner.user.email,
                        app.name,
                        app.clientId,
                        newClientSecret
                    );
                } catch (error) {
                    console.error(`Failed to send client secret email to ${owner.user.email}:`, error);
                }
            }
        }

        // Return the secret in the response (only time it's shown)
        return {
            id: app.id,
            name: app.name,
            client_id: app.clientId,
            client_secret: newClientSecret,
            type: app.type,
            redirect_uris: app.redirectUris as string[],
            created_at: app.createdAt,
        };
    }

    return {
        id: app.id,
        name: app.name,
        client_id: app.clientId,
        type: app.type,
        redirect_uris: app.redirectUris as string[],
        created_at: app.createdAt,
    };
}

/**
 * Delete app by id.
 */
export async function deleteAppById(appId: string) {
    const app = await prisma.app.delete({
        where: {id: appId},
    });

    if (!app) {
        throw new NotFoundError('Application not found');
    }
    return app;
}

/**
 * Verify client credentials
 */
export async function verifyClientCredentials(
    clientId: string,
    clientSecret?: string
) {
    const app = await findAppByClientId(clientId);

    if (app.type === 'CONFIDENTIAL') {
        if (!clientSecret) {
            throw new AuthError('Client secret required for confidential apps');
        }
        if (!app.clientSecretHash) {
            throw new AuthError('Invalid client configuration');
        }

        const {verifyPassword} = await import('./password.service');
        const isValid = await verifyPassword(app.clientSecretHash, clientSecret);

        if (!isValid) {
            throw new AuthError('Invalid client credentials');
        }
    }

    return app;
}

/**
 * Get all users that have opted into an app with their roles
 */
export async function getAppUsers(appId: string, page: number = 1, limit: number = 20) {
    // Verify app exists
    const app = await findAppById(appId);

    const skip = (page - 1) * limit;

    // Get all users who have opted into this app
    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where: {
                optedInApps: {
                    has: appId,
                },
            },
            select: {
                id: true,
                email: true,
                isEmailVerified: true,
                mfaEnabled: true,
                createdAt: true,
                userAppRoles: {
                    where: {
                        appId: appId,
                    },
                    include: {
                        role: true,
                    },
                },
            },
            skip,
            take: limit,
            orderBy: {
                createdAt: 'desc',
            },
        }),
        prisma.user.count({
            where: {
                optedInApps: {
                    has: appId,
                },
            },
        }),
    ]);

    return {
        app: {
            id: app.id,
            name: app.name,
            clientId: app.clientId,
            type: app.type,
            redirectUris: app.redirectUris as string[],
        },
        users: users.map((user) => ({
            id: user.id,
            email: user.email,
            isEmailVerified: user.isEmailVerified,
            mfaEnabled: user.mfaEnabled,
            createdAt: user.createdAt,
            roles: user.userAppRoles.map((uar) => uar.role.name),
        })),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}

