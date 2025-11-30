import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import { hashPassword } from './password.service';
import { NotFoundError, ConflictError, AuthError } from '../utils/errors';
import { AppType } from '@prisma/client';

export interface CreateAppInput {
  name: string;
  type: 'PUBLIC' | 'CONFIDENTIAL';
  redirect_uris: string[];
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
    where: { clientId },
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
    where: { id: appId },
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

    const { verifyPassword } = await import('./password.service');
    const isValid = await verifyPassword(app.clientSecretHash, clientSecret);

    if (!isValid) {
      throw new AuthError('Invalid client credentials');
    }
  }

  return app;
}

