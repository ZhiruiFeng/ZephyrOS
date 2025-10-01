import { NextRequest } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabase-server'
import { hashApiKey } from '@/lib/crypto-utils'

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
  if (!token) {
    console.log('🔍 No Bearer token found in request')
    return null
  }

  console.log('🔍 Bearer token found:', token.substring(0, 50) + '...')

  // API key path: Bearer zm_...
  if (token.startsWith('zm_')) {
    console.log('🔑 Detected API key authentication')
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
      } catch (updateError) {
        // Silent fail for usage update
      }

      return {
        id: row.user_id as string,
        authType: 'api_key',
        scopes: (row.scopes as string[]) || [],
        keyId: row.key_id as string,
      }
    } catch (error) {
      return null
    }
  }

  // OAuth path via Supabase JWT
  console.log('🔐 Attempting OAuth JWT validation')
  const client = createClientForRequest(request)
  if (!client) {
    console.log('❌ Failed to create Supabase client')
    return null
  }

  try {
    const { data, error } = await client.auth.getUser()

    if (error) {
      console.log('❌ Supabase auth.getUser() error:', error.message)
      return null
    }

    if (!data.user) {
      console.log('❌ No user in response')
      return null
    }

    console.log('✅ OAuth authenticated! User ID:', data.user.id)
    return { id: data.user.id, authType: 'oauth' }
  } catch (error) {
    console.log('❌ Exception in OAuth validation:', error)
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
 * - API key auth: Uses service role client (bypasses RLS, no JWT parsing)
 * - OAuth auth: Uses user-scoped client (enforces RLS with JWT)
 */
export async function getClientForAuthType(request: NextRequest): Promise<SupabaseClient | null> {
  const authContext = await getAuthContext(request)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (authContext?.authType === 'api_key') {
    // For API key auth, use service role client to avoid JWT parsing errors
    // Service role key bypasses RLS automatically
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
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

  // For OAuth or unknown auth type, use regular client with user's JWT
  return createClientForRequest(request)
}

/**
 * Helper to conditionally add user_id to payload based on auth type
 * - API key auth: Must explicitly set user_id (service role client bypasses RLS)
 * - OAuth auth: Should NOT set user_id (let RLS use auth.uid() from JWT)
 *
 * @param payload The payload object to conditionally add user_id to
 * @param userId The user ID to add
 * @param request The request to check auth type from
 */
export async function addUserIdIfNeeded(
  payload: Record<string, any>,
  userId: string,
  request: NextRequest
): Promise<void> {
  const authContext = await getAuthContext(request)
  if (authContext?.authType === 'api_key') {
    payload.user_id = userId
  }
  // For OAuth, don't set user_id - let the database default (auth.uid()) handle it
}

// Re-export from other auth modules for easy access
export * from './api-key-auth'
export * from './oauth'
export * from './session-manager'
export * from './supabase-session-manager'

