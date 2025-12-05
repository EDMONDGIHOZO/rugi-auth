import jwt from 'jsonwebtoken';
import crypto from "crypto";
import { getPrivateKey, getPublicKey } from '../config/keys';
import { env } from '../config/env';
import { AuthError } from '../utils/errors';

/**
 * Generate key ID from public key fingerprint
 */
function getKeyId(): string {
  const publicKey = getPublicKey();
  return crypto
    .createHash('sha256')
    .update(publicKey)
    .digest('hex')
    .substring(0, 8);
}

export interface TokenPayload {
  sub: string; // user_id
  aud: string; // client_id
  tid: string; // app_id
  roles: string[];
  iat: number;
  exp: number;
  iss: string;
}

/**
 * Generate a JWT access token with RS256
 */
export function generateAccessToken(
  userId: string,
  clientId: string,
  appId: string,
  roles: string[]
): string {
  const privateKey = getPrivateKey();

  const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
    sub: userId,
    aud: clientId,
    tid: appId,
    roles,
    iss: env.jwt.issuer,
  };

  return jwt.sign(payload, privateKey, {
    algorithm: "RS256",
    expiresIn: env.jwt.accessTokenExpiry,
    keyid: getKeyId(),
  });
}

/**
 * Verify and decode a JWT access token
 */
export function verifyAccessToken(token: string): TokenPayload {
  try {
    const publicKey = getPublicKey();
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: env.jwt.issuer,
    }) as TokenPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthError('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthError('Invalid token');
    }
    throw new AuthError('Token verification failed');
  }
}

/**
 * Decode token without verification (for debugging/logging only)
 */
export function decodeToken(token: string): jwt.JwtPayload | null {
  return jwt.decode(token, { complete: false }) as jwt.JwtPayload | null;
}

