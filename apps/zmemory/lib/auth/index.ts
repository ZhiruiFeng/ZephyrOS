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
    console.log('[AUTH] No bearer token found in request')
    return null
  }

  console.log('[AUTH] Token received:', token.substring(0, 10) + '...')

  // API key path: Bearer zm_...
  if (token.startsWith('zm_')) {
    console.log('[AUTH] Detected ZMemory API key (starts with zm_)')

    if (!supabaseServer) {
      console.error('[AUTH] CRITICAL: supabaseServer is null')
      console.error('[AUTH] SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET')
      console.error('[AUTH] SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET (length: ' + process.env.SUPABASE_SERVICE_ROLE_KEY.length + ')' : 'NOT SET')
      return null
    }

    console.log('[AUTH] supabaseServer is initialized, attempting API key authentication')

    try {
      const keyHash = await hashApiKey(token)
      console.log('[AUTH] API key hashed successfully:', keyHash.substring(0, 20) + '...')

      console.log('[AUTH] Calling authenticate_zmemory_api_key RPC function...')
      const { data, error } = await supabaseServer.rpc('authenticate_zmemory_api_key', { api_key_hash: keyHash })

      if (error) {
        console.error('[AUTH] RPC function returned error:', JSON.stringify(error))
        return null
      }

      console.log('[AUTH] RPC function returned data:', data ? 'DATA PRESENT' : 'NO DATA')

      if (!data || (Array.isArray(data) && data.length === 0)) {
        console.error('[AUTH] API key not found or invalid')
        return null
      }

      const row = Array.isArray(data) ? (data as any[])[0] : (data as any)
      console.log('[AUTH] API key authenticated successfully for user:', row.user_id)

      // Best-effort usage update (await to avoid thenable .catch issues)
      try {
        await supabaseServer.rpc('update_zmemory_api_key_usage', { api_key_hash: keyHash })
        console.log('[AUTH] API key usage updated')
      } catch (updateError) {
        console.error('[AUTH] Failed to update API key usage:', updateError)
      }

      return {
        id: row.user_id as string,
        authType: 'api_key',
        scopes: (row.scopes as string[]) || [],
        keyId: row.key_id as string,
      }
    } catch (error) {
      console.error('[AUTH] Exception during API key authentication:', error)
      return null
    }
  }

  console.log('[AUTH] Not an API key, attempting OAuth JWT authentication')

  // OAuth path via Supabase JWT
  const client = createClientForRequest(request)
  if (!client) {
    console.error('[AUTH] Failed to create Supabase client for OAuth')
    return null
  }

  try {
    console.log('[AUTH] Calling client.auth.getUser() for JWT validation')
    const { data, error } = await client.auth.getUser()

    if (error) {
      console.error('[AUTH] OAuth JWT validation error:', JSON.stringify(error))
      return null
    }

    if (!data.user) {
      console.error('[AUTH] OAuth JWT valid but no user found')
      return null
    }

    console.log('[AUTH] OAuth authentication successful for user:', data.user.id)
    return { id: data.user.id, authType: 'oauth' }
  } catch (error) {
    console.error('[AUTH] Exception during OAuth authentication:', error)
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
    // This client bypasses RLS but we already validated the user via the API key
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[AUTH] Cannot create service role client - missing env vars')
      return null
    }
    console.log('[AUTH] getClientForAuthType: Creating service role client for API key auth')
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  // For OAuth or unknown auth type, use regular client with user's JWT
  console.log('[AUTH] getClientForAuthType: Creating user-scoped client for OAuth auth')
  return createClientForRequest(request)
}

// Re-export from other auth modules for easy access
export * from './api-key-auth'
export * from './oauth'
export * from './session-manager'
export * from './supabase-session-manager'

