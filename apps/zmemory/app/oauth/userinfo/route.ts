import { NextRequest, NextResponse } from 'next/server'
import { createClientForRequest } from '../../../lib/auth'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
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
  } catch (e) {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}


