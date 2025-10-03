import { randomBytes, createHash } from 'crypto';

/**
 * Generate a cryptographically secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Generate a secure API key with prefix
 */
export function generateApiKey(prefix: string = 'zm'): string {
  const token = generateSecureToken(32);
  return `${prefix}_${token}`;
}

/**
 * Hash an API key for secure storage
 * Uses Web Crypto when available; falls back to Node crypto in server runtimes.
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  try {
    // Prefer Web Crypto (available in browsers and some Node runtimes)
    if (typeof globalThis !== 'undefined' && (globalThis as any).crypto?.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(apiKey);
      const hashBuffer = await (globalThis as any).crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    // Fall through to Node crypto
  }

  // Node.js fallback
  return createHash('sha256').update(apiKey, 'utf8').digest('hex');
}

/**
 * Verify an API key against its hash
 */
export async function verifyApiKey(apiKey: string, hash: string): Promise<boolean> {
  const computedHash = await hashApiKey(apiKey);
  return computedHash === hash;
}

/**
 * Generate a preview of an API key (showing only last few characters)
 */
export function generateKeyPreview(apiKey: string, visibleChars: number = 6): string {
  if (apiKey.length < visibleChars) {
    return apiKey;
  }

  const prefix = apiKey.includes('_') ? apiKey.split('_')[0] + '_' : '';
  const suffix = apiKey.slice(-visibleChars);
  return `${prefix}***${suffix}`;
}
