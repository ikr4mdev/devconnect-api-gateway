import { readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

function requiredEnv(name: string) {
  const value: unknown = process.env[name];

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value.trim();
}

function readFile(absolutePath: string): string {
  if (!isAbsolute(absolutePath)) {
    throw new Error('JWT_PUBLIC_KEY_PATH must be an absolute path');
  }

  let contents: string;

  try {
    contents = readFileSync(absolutePath, 'utf8');
  } catch (cause) {
    throw new Error('Failed to read JWT public key file', { cause });
  }

  if (contents.trim() === '') {
    throw new Error('JWT public key file is empty or blank');
  }

  return contents;
}

function requiredAudience(name: string): string {
  const audience = requiredEnv(name);

  if (audience !== 'gateway') {
    throw new Error(`Env var ${name} must be "gateway", got "${audience}"`);
  }

  return audience;
}

export const gatewayConfig = {
  jwtPublicKey: readFile(requiredEnv('JWT_PUBLIC_KEY_PATH')),
  audience: requiredAudience('JWT_AUDIENCE'),
  issuer: requiredEnv('JWT_ISSUER'),
} as const;
