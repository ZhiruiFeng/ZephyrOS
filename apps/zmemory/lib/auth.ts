import { NextRequest } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/config/supabase-server'
import { hashApiKey } from '@/lib/utils/crypto-utils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined

export function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader) return null
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  return match ? match[1] : null
}

export function createClientForRequest(request: NextRequest): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null
  const token = getBearerToken(request)
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  return client
}

export type AuthContext = {
  id: string
  authType: 'oauth' | 'api_key'
  scopes?: string[]
  keyId?: string
}

/**
 * Unified auth: supports Supabase OAuth JWT and ZMemory API keys (Bearer zm_...)
 */
export async function getAuthContext(request: NextRequest): Promise<AuthContext | null> {
  const token = getBearerToken(request)
  if (!token) return null

  // API key path: Bearer zm_...
  if (token.startsWith('zm_')) {
    if (!supabaseServer) {
      return null
    }
    try {
      const keyHash = await hashApiKey(token)
      const { data, error } = await supabaseServer.rpc('authenticate_zmemory_api_key', { api_key_hash: keyHash })
      if (error) {
        return null
      }
      if (!data || (Array.isArray(data) && data.length === 0)) {
        return null
      }
      const row = Array.isArray(data) ? (data as any[])[0] : (data as any)
      // Best-effort usage update (await to avoid thenable .catch issues)
      try {
        await supabaseServer.rpc('update_zmemory_api_key_usage', { api_key_hash: keyHash })
      } catch {}
      return {
        id: row.user_id as string,
        authType: 'api_key',
        scopes: (row.scopes as string[]) || [],
        keyId: row.key_id as string,
      }
    } catch {
      return null
    }
  }

  // OAuth path via Supabase JWT
  const client = createClientForRequest(request)
  if (!client) return null
  try {
    const { data, error } = await client.auth.getUser()
    if (error || !data.user) return null
    return { id: data.user.id, authType: 'oauth' }
  } catch {
    return null
  }
}

export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const ctx = await getAuthContext(request)
  return ctx?.id ?? null
}

/**
 * Get user object from request (works for OAuth or API key)
 */
export async function getUser(request: NextRequest): Promise<{ id: string } | null> {
  const ctx = await getAuthContext(request)
  if (!ctx) return null
  return { id: ctx.id }
}

/**
 * Get appropriate Supabase client based on authentication type
 * - For server-side operations, we always use service role client to bypass RLS
 * - We validate the user via JWT/API key and explicitly set user_id in payloads
 * - This is the recommended pattern for server-side Next.js API routes
 */
export async function getClientForAuthType(request: NextRequest): Promise<SupabaseClient | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Always use service role client for server-side operations
  // We've already validated the user via getAuthContext/getUserIdFromRequest
  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Helper to add user_id to payload for server-side operations
 * Since we always use service role client (which bypasses RLS),
 * we must explicitly set user_id for all authenticated requests
 *
 * @param payload The payload object to add user_id to
 * @param userId The user ID to add
 * @param request The request (for future extensibility)
 */
export async function addUserIdIfNeeded(
  payload: Record<string, any>,
  userId: string,
  request: NextRequest
): Promise<void> {
  // Always set user_id since we're using service role client
  payload.user_id = userId
}

