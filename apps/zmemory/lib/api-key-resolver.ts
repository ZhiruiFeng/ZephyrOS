import { apiKeyService } from './api-key-service';

/**
 * API Key Resolver
 * 
 * Helper service to resolve API keys for vendor services.
 * Uses user-stored keys as primary source, falls back to environment variables.
 */

export interface ResolvedApiKey {
  key: string;
  source: 'user' | 'environment';
  keyId?: string;
}

/**
 * Resolve API key for a specific vendor and service
 * Priority: user stored key > environment variable
 */
export async function resolveApiKey(
  userId: string | null,
  vendorId: string,
  serviceId?: string
): Promise<ResolvedApiKey | null> {
  // Try to get user-stored key first
  if (userId) {
    try {
      const userKey = await apiKeyService.getDecryptedApiKey(userId, vendorId, serviceId);
      if (userKey) {
        return {
          key: userKey.apiKey,
          source: 'user',
          keyId: userKey.keyId
        };
      }
    } catch (error) {
      console.error(`Failed to retrieve user API key for ${vendorId}:`, error);
      // Continue to fallback
    }
  }

  // Fallback to environment variables
  const envKey = getEnvironmentApiKey(vendorId);
  if (envKey) {
    return {
      key: envKey,
      source: 'environment'
    };
  }

  return null;
}

/**
 * Get API key from environment variables for a vendor
 */
function getEnvironmentApiKey(vendorId: string): string | null {
  switch (vendorId) {
    case 'openai':
      return process.env.OPENAI_API_KEY || null;
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY || null;
    case 'google':
      return process.env.GOOGLE_API_KEY || null;
    case 'azure':
      return process.env.AZURE_OPENAI_API_KEY || null;
    case 'replicate':
      return process.env.REPLICATE_API_TOKEN || null;
    case 'together':
      return process.env.TOGETHER_API_KEY || null;
    case 'elevenlabs':
      return process.env.ELEVENLABS_API_KEY || null;
    case 'stability':
      return process.env.STABILITY_API_KEY || null;
    case 'cohere':
      return process.env.COHERE_API_KEY || null;
    case 'huggingface':
      return process.env.HUGGINGFACE_API_KEY || null;
    default:
      return null;
  }
}

/**
 * Resolve OpenAI API key specifically
 * Supports both general OpenAI keys and service-specific keys
 */
export async function resolveOpenAIKey(
  userId: string | null,
  serviceId?: string
): Promise<ResolvedApiKey | null> {
  // Try service-specific key first if serviceId provided
  if (serviceId) {
    const serviceKey = await resolveApiKey(userId, 'openai', serviceId);
    if (serviceKey) {
      return serviceKey;
    }
  }

  // Fall back to general OpenAI key
  return await resolveApiKey(userId, 'openai');
}

/**
 * Resolve Anthropic API key
 */
export async function resolveAnthropicKey(
  userId: string | null,
  serviceId?: string
): Promise<ResolvedApiKey | null> {
  return await resolveApiKey(userId, 'anthropic', serviceId);
}

/**
 * Validate that we have an API key for a vendor before making requests
 */
export async function ensureApiKey(
  userId: string | null,
  vendorId: string,
  serviceId?: string
): Promise<ResolvedApiKey> {
  const resolved = await resolveApiKey(userId, vendorId, serviceId);
  
  if (!resolved) {
    throw new Error(
      `No API key available for ${vendorId}${serviceId ? `/${serviceId}` : ''}. ` +
      `Please configure an API key in your settings or set the environment variable.`
    );
  }
  
  return resolved;
}

/**
 * Get available key sources for a user and vendor
 */
export async function getKeyAvailability(
  userId: string | null,
  vendorId: string
): Promise<{
  hasUserKey: boolean;
  hasEnvironmentKey: boolean;
  sources: ('user' | 'environment')[];
}> {
  let hasUserKey = false;
  let hasEnvironmentKey = false;

  // Check user key
  if (userId) {
    try {
      const userKey = await apiKeyService.getDecryptedApiKey(userId, vendorId);
      hasUserKey = !!userKey;
    } catch (error) {
      // Ignore errors, just mark as unavailable
    }
  }

  // Check environment key
  hasEnvironmentKey = !!getEnvironmentApiKey(vendorId);

  const sources: ('user' | 'environment')[] = [];
  if (hasUserKey) sources.push('user');
  if (hasEnvironmentKey) sources.push('environment');

  return {
    hasUserKey,
    hasEnvironmentKey,
    sources
  };
}