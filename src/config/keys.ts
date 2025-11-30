import fs from 'fs';
import path from 'path';
import { env } from './env';

let privateKey: string | null = null;
let publicKey: string | null = null;

/**
 * Load RSA private key from file
 */
export function getPrivateKey(): string {
  if (privateKey) {
    return privateKey;
  }

  const keyPath = path.resolve(env.keys.privateKeyPath);
  
  if (!fs.existsSync(keyPath)) {
    throw new Error(
      `Private key not found at ${keyPath}. Run 'npm run generate:keys' to generate keys.`
    );
  }

  privateKey = fs.readFileSync(keyPath, 'utf-8');
  return privateKey;
}

/**
 * Load RSA public key from file
 */
export function getPublicKey(): string {
  if (publicKey) {
    return publicKey;
  }

  const keyPath = path.resolve(env.keys.publicKeyPath);
  
  if (!fs.existsSync(keyPath)) {
    throw new Error(
      `Public key not found at ${keyPath}. Run 'npm run generate:keys' to generate keys.`
    );
  }

  publicKey = fs.readFileSync(keyPath, 'utf-8');
  return publicKey;
}

/**
 * Clear cached keys (useful for testing or key rotation)
 */
export function clearKeyCache(): void {
  privateKey = null;
  publicKey = null;
}

