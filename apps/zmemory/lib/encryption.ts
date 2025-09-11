import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto';

/**
 * API Key Encryption Utilities
 * 
 * Uses AES-256-GCM encryption with PBKDF2-derived keys for secure storage
 * of user API keys in the database.
 */

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits
const TAG_LENGTH = 16; // 128 bits
const ITERATIONS = 100000; // PBKDF2 iterations

/**
 * Get or generate the master encryption key from environment
 */
function getMasterKey(): string {
  const masterKey = process.env.API_KEY_ENCRYPTION_SECRET;
  
  if (!masterKey) {
    throw new Error(
      'API_KEY_ENCRYPTION_SECRET environment variable is required. ' +
      'Generate a secure 32-byte key: openssl rand -hex 32'
    );
  }
  
  if (masterKey.length < 32) {
    throw new Error(
      'API_KEY_ENCRYPTION_SECRET must be at least 32 characters long. ' +
      'Generate a secure key: openssl rand -hex 32'
    );
  }
  
  return masterKey;
}

/**
 * Derive encryption key from master key and user-specific salt
 */
function deriveKey(masterKey: string, salt: Buffer, userId: string): Buffer {
  // Combine master key with user ID for user-specific derivation
  const keyMaterial = masterKey + userId;
  return pbkdf2Sync(keyMaterial, salt, ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt an API key for storage
 */
export function encryptApiKey(apiKey: string, userId: string): string {
  try {
    const masterKey = getMasterKey();
    
    // Generate random salt and IV
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);
    
    // Derive user-specific encryption key
    const key = deriveKey(masterKey, salt, userId);
    
    // Encrypt the API key
    const cipher = createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag
    const tag = cipher.getAuthTag();
    
    // Combine salt + iv + tag + encrypted data
    const combined = Buffer.concat([
      salt,
      iv, 
      tag,
      Buffer.from(encrypted, 'hex')
    ]);
    
    return combined.toString('base64');
  } catch (error) {
    throw new Error(`Failed to encrypt API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt an API key from storage
 */
export function decryptApiKey(encryptedData: string, userId: string): string {
  try {
    const masterKey = getMasterKey();
    
    // Parse the combined data
    const combined = Buffer.from(encryptedData, 'base64');
    
    if (combined.length < SALT_LENGTH + IV_LENGTH + TAG_LENGTH + 1) {
      throw new Error('Invalid encrypted data format');
    }
    
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    
    // Derive the same encryption key
    const key = deriveKey(masterKey, salt, userId);
    
    // Decrypt the API key
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`Failed to decrypt API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a preview of the API key (last 4 characters)
 */
export function generateKeyPreview(apiKey: string): string {
  if (apiKey.length < 4) {
    return '****';
  }
  return '***' + apiKey.slice(-4);
}

/**
 * Validate API key format for different vendors
 */
export function validateApiKeyFormat(apiKey: string, vendorId: string): { isValid: boolean; error?: string } {
  if (!apiKey || typeof apiKey !== 'string') {
    return { isValid: false, error: 'API key is required' };
  }
  
  if (apiKey.length < 8) {
    return { isValid: false, error: 'API key is too short' };
  }
  
  if (apiKey.length > 200) {
    return { isValid: false, error: 'API key is too long' };
  }
  
  // Vendor-specific validation
  switch (vendorId) {
    case 'openai':
      if (!apiKey.startsWith('sk-')) {
        return { isValid: false, error: 'OpenAI API keys must start with "sk-"' };
      }
      break;
      
    case 'anthropic':
      if (!apiKey.startsWith('sk-ant-')) {
        return { isValid: false, error: 'Anthropic API keys must start with "sk-ant-"' };
      }
      break;
      
    case 'google':
      // Google API keys are typically 39 characters
      if (!/^[A-Za-z0-9_-]{20,40}$/.test(apiKey)) {
        return { isValid: false, error: 'Invalid Google API key format' };
      }
      break;
      
    case 'replicate':
      if (!apiKey.startsWith('r8_')) {
        return { isValid: false, error: 'Replicate API keys must start with "r8_"' };
      }
      break;
      
    case 'together':
      // Together AI keys are typically long hex strings
      if (!/^[a-fA-F0-9]{64,}$/.test(apiKey)) {
        return { isValid: false, error: 'Invalid Together AI API key format' };
      }
      break;
      
    case 'elevenlabs':
      // ElevenLabs keys are typically 32-character hex strings
      if (!/^[a-fA-F0-9]{32}$/.test(apiKey)) {
        return { isValid: false, error: 'Invalid ElevenLabs API key format' };
      }
      break;
      
    // For other vendors, just check basic format
    default:
      if (!/^[A-Za-z0-9_-]+$/.test(apiKey)) {
        return { isValid: false, error: 'API key contains invalid characters' };
      }
  }
  
  return { isValid: true };
}

/**
 * Securely compare two strings to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Generate a secure random token for testing API keys
 */
export function generateTestToken(): string {
  return randomBytes(16).toString('hex');
}