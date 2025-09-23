import { NextRequest, NextResponse } from 'next/server'
import { createClientForRequest, getAuthContext } from '../../../lib/auth'
import { supabaseServer } from '../../../lib/supabase-server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // OAuth: use Supabase client to fetch detailed user info
    if (ctx.authType === 'oauth') {
      const client = createClientForRequest(request)
      if (!client) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const { data, error } = await client.auth.getUser()
      if (error || !data.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const user = data.user
      return NextResponse.json({
        sub: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email,
      })
    }

    // API key: fetch user info via admin if available, otherwise return minimal info
    if (!supabaseServer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    try {
      const { data, error } = await supabaseServer.auth.admin.getUserById(ctx.id)
      if (error || !data?.user) {
        // Fallback to minimal payload if admin lookup fails
        return NextResponse.json({ sub: ctx.id, email: 'unknown', name: 'unknown' })
      }
      const user = data.user
      return NextResponse.json({
        sub: user.id,
        email: user.email ?? 'unknown',
        name: (user.user_metadata as any)?.full_name || user.email || 'unknown',
      })
    } catch {
      return NextResponse.json({ sub: ctx.id, email: 'unknown', name: 'unknown' })
    }
  } catch (e) {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

