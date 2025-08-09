import { NextRequest } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

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

export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const client = createClientForRequest(request)
  if (!client) return null
  try {
    const { data, error } = await client.auth.getUser()
    if (error) return null
    return data.user?.id ?? null
  } catch {
    return null
  }
}


