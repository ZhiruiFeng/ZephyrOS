import { NextRequest, NextResponse } from 'next/server'
import { consumeAuthorizationCode, findClient, hashCodeVerifier } from '@/lib/auth/oauth'
import { createClient } from '@supabase/supabase-js'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json')
    const body = isJson ? await request.json() : Object.fromEntries(new URLSearchParams(await request.text()))

    const grant_type = body.grant_type

    if (grant_type === 'authorization_code') {
      const code = body.code
      const redirect_uri = body.redirect_uri
      const client_id = body.client_id
      const code_verifier = body.code_verifier as string | undefined
      if (!code || !redirect_uri || !client_id) {
        return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
      }
      const client = findClient(client_id)
      if (!client || !client.redirect_uris.includes(redirect_uri)) {
        return NextResponse.json({ error: 'unauthorized_client' }, { status: 400 })
      }
      const payload = consumeAuthorizationCode(code)
      if (!payload) {
        return NextResponse.json({ error: 'invalid_grant' }, { status: 400 })
      }
      if (payload.client_id !== client_id || payload.redirect_uri !== redirect_uri) {
        return NextResponse.json({ error: 'invalid_grant' }, { status: 400 })
      }
      if (payload.code_challenge) {
        if (!code_verifier) return NextResponse.json({ error: 'invalid_request', error_description: 'missing code_verifier' }, { status: 400 })
        const expected = payload.code_challenge_method === 'S256' ? hashCodeVerifier(code_verifier) : code_verifier
        if (expected !== payload.code_challenge) {
          return NextResponse.json({ error: 'invalid_grant', error_description: 'pkce verification failed' }, { status: 400 })
        }
      }

      // Return Supabase tokens as OAuth tokens
      return NextResponse.json({
        token_type: 'Bearer',
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
        expires_in: payload.expires_in ?? 3600,
        scope: payload.scope || 'tasks.write',
      })
    }

    if (grant_type === 'refresh_token') {
      const refresh_token = body.refresh_token as string | undefined
      if (!refresh_token) return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
      if (!supabaseUrl || !supabaseAnonKey) return NextResponse.json({ error: 'server_error' }, { status: 500 })
      const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } })
      try {
        const { data, error } = await supabase.auth.refreshSession({ refresh_token })
        if (error || !data.session) return NextResponse.json({ error: 'invalid_grant' }, { status: 400 })
        return NextResponse.json({
          token_type: 'Bearer',
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_in: 3600,
          scope: 'tasks.write',
        })
      } catch {
        return NextResponse.json({ error: 'server_error' }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'unsupported_grant_type' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}


