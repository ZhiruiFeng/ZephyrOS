import { NextRequest, NextResponse } from 'next/server'
import { createClientForRequest, getUserIdFromRequest } from '../../../../lib/auth'
import { findClient, generateRandomString, isRedirectUriAllowed, saveAuthorizationCode } from '../../../../lib/oauth'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { client_id, redirect_uri, scope, state, code_challenge, code_challenge_method, refresh_token } = body || {}
    if (!client_id || !redirect_uri) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
    }

    const client = findClient(client_id)
    if (!client) {
      return NextResponse.json({ error: 'unauthorized_client' }, { status: 400 })
    }
    if (!isRedirectUriAllowed(client, redirect_uri)) {
      return NextResponse.json({ error: 'invalid_redirect_uri' }, { status: 400 })
    }

    // We directly use the Supabase access token from the Authorization header
    const bearer = request.headers.get('authorization') || request.headers.get('Authorization')
    const token = bearer?.replace(/^Bearer\s+/i, '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const code = generateRandomString(48)
    saveAuthorizationCode(code, {
      client_id,
      redirect_uri,
      user_id: userId,
      access_token: token,
      refresh_token: refresh_token,
      expires_in: 3600,
      scope,
      code_challenge,
      code_challenge_method,
      created_at: Date.now(),
    })

    const url = new URL(redirect_uri)
    url.searchParams.set('code', code)
    if (state) url.searchParams.set('state', state)

    return NextResponse.json({ redirect: url.toString() })
  } catch (e) {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}


