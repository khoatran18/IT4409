import { randomBytes } from 'node:crypto';
import type { DeploySecrets } from './types';

/** Chỉ gồm [A-Za-z0-9_-] nên dùng được trực tiếp trong URL và file .env */
export function generateSecrets(): DeploySecrets {
  return {
    dbPassword: randomBytes(18).toString('base64url'),
    jwtSecret: randomBytes(48).toString('base64url'),
  };
}
