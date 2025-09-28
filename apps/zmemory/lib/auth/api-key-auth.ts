import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hashApiKey } from '@/lib/crypto-utils';
import { getUser } from './index';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export interface ApiKeyUser {
  id: string;
  scopes: string[];
  keyId: string;
  authType: 'api_key';
}

export interface OAuthUser {
  id: string;
  authType: 'oauth';
}

export type AuthenticatedUser = ApiKeyUser | OAuthUser;

/**
 * Enhanced authentication that supports both OAuth and API key authentication
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  // Check if it's a ZMemory API key (starts with "zm_")
  if (token.startsWith('zm_')) {
    return await authenticateApiKey(token);
  }

  // Otherwise, try OAuth authentication
  const oauthUser = await getUser(request);
  if (oauthUser) {
    return {
      id: oauthUser.id,
      authType: 'oauth'
    };
  }

  return null;
}

/**
 * Authenticate using ZMemory API key
 */
async function authenticateApiKey(apiKey: string): Promise<ApiKeyUser | null> {
  try {
    // Hash the provided API key
    const keyHash = await hashApiKey(apiKey);

    // Use the database function to authenticate
    const { data, error } = await supabase
      .rpc('authenticate_zmemory_api_key', { api_key_hash: keyHash });

    if (error || !data || data.length === 0) {
      return null;
    }

    const authData = data[0];

    // Update last_used_at
    await supabase
      .rpc('update_zmemory_api_key_usage', { api_key_hash: keyHash });

    return {
      id: authData.user_id,
      scopes: authData.scopes || [],
      keyId: authData.key_id,
      authType: 'api_key'
    };
  } catch (error) {
    console.error('API key authentication error:', error);
    return null;
  }
}

/**
 * Check if the authenticated user has a specific scope
 */
export function hasScope(user: AuthenticatedUser, scope: string): boolean {
  if (user.authType === 'oauth') {
    // OAuth users have full access
    return true;
  }

  // API key users need to have the specific scope
  return user.scopes.includes(scope);
}

/**
 * Middleware to require authentication with optional scope checking
 */
export function requireAuth(requiredScopes: string[] = []) {
  return async (request: NextRequest, handler: (user: AuthenticatedUser) => Promise<Response>) => {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized', success: false }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check required scopes for API key users
    if (user.authType === 'api_key' && requiredScopes.length > 0) {
      const hasAllScopes = requiredScopes.every(scope => hasScope(user, scope));
      if (!hasAllScopes) {
        return new Response(JSON.stringify({
          error: 'Insufficient permissions',
          required_scopes: requiredScopes,
          success: false
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return handler(user);
  };
}

/**
 * Available scopes for ZMemory API keys
 */
export const ZMEMORY_SCOPES = {
  // Tasks
  'tasks.read': 'Read tasks and task data',
  'tasks.write': 'Create, update, and delete tasks',
  'tasks.time': 'Track time for tasks',

  // Memories
  'memories.read': 'Read memories and memory data',
  'memories.write': 'Create, update, and delete memories',

  // Activities
  'activities.read': 'Read activities and activity data',
  'activities.write': 'Create, update, and delete activities',

  // Timeline
  'timeline.read': 'Read timeline data and insights',
  'timeline.write': 'Create timeline entries',

  // AI Tasks
  'ai_tasks.read': 'Read AI tasks and their status',
  'ai_tasks.write': 'Create, update, and manage AI tasks',

  // Categories
  'categories.read': 'Read task categories',
  'categories.write': 'Create and manage task categories',

  // Full access (for backward compatibility)
  'admin': 'Full administrative access (equivalent to OAuth)'
} as const;

export type ZMemoryScope = keyof typeof ZMEMORY_SCOPES;