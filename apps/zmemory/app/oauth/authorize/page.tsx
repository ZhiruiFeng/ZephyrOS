"use client"

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
}) : null

function OAuthAuthorizeContent() {
  const params = useSearchParams()
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [email, setEmail] = React.useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = React.useState(false)

  // Persist/restore OAuth query params to avoid losing them when redirectTo uses a clean path
  const storageKey = 'oauth_authorize_params'
  const [clientId, setClientId] = React.useState('')
  const [redirectUri, setRedirectUri] = React.useState('')
  const [scope, setScope] = React.useState('')
  const [state, setState] = React.useState('')
  const [codeChallenge, setCodeChallenge] = React.useState<string | undefined>(undefined)
  const [codeChallengeMethod, setCodeChallengeMethod] = React.useState<'S256' | 'plain' | undefined>(undefined)

  React.useEffect(() => {
    let mounted = true
    async function checkSession() {
      if (!supabase) return
      const { data } = await supabase.auth.getSession()
      const user = data.session?.user
      if (!mounted) return
      setIsLoggedIn(Boolean(user))
      setEmail(user?.email ?? null)
    }
    checkSession()
    const { data: sub } = supabase?.auth.onAuthStateChange(() => checkSession()) || { data: { subscription: null } as any }
    
    // Initialize query params from URL or from localStorage fallback
    const init = () => {
      const fromUrl = {
        client_id: params.get('client_id') || '',
        redirect_uri: params.get('redirect_uri') || '',
        scope: params.get('scope') || '',
        state: params.get('state') || '',
        code_challenge: params.get('code_challenge') || undefined,
        code_challenge_method: (params.get('code_challenge_method') as 'S256' | 'plain' | null) || undefined,
      }
      if (fromUrl.client_id || fromUrl.redirect_uri) {
        setClientId(fromUrl.client_id)
        setRedirectUri(fromUrl.redirect_uri)
        setScope(fromUrl.scope)
        setState(fromUrl.state)
        setCodeChallenge(fromUrl.code_challenge)
        setCodeChallengeMethod(fromUrl.code_challenge_method)
      } else {
        try {
          const saved = localStorage.getItem(storageKey)
          if (saved) {
            const parsed = JSON.parse(saved)
            setClientId(parsed.client_id || '')
            setRedirectUri(parsed.redirect_uri || '')
            setScope(parsed.scope || '')
            setState(parsed.state || '')
            setCodeChallenge(parsed.code_challenge)
            setCodeChallengeMethod(parsed.code_challenge_method)
          }
        } catch {}
      }
    }
    init()
    return () => {
      mounted = false
      sub?.subscription?.unsubscribe?.()
    }
  }, [])

  async function handleLogin() {
    if (!supabase) return
    setLoading(true)
    setError(null)
    try {
      // Save current query params for restoration after redirect
      try {
        localStorage.setItem(storageKey, JSON.stringify({
          client_id: clientId,
          redirect_uri: redirectUri,
          scope,
          state,
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod,
        }))
      } catch {}

      const cleanAuthorizeUrl = `${window.location.origin}/oauth/authorize`
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: cleanAuthorizeUrl }
      })
      if (error) setError(error.message)
    } catch (e: any) {
      setError(String(e?.message || e))
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove() {
    if (!supabase) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      const refreshToken = data.session?.refresh_token
      if (!token) throw new Error('未登录')

      const res = await fetch(`/oauth/authorize/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          client_id: clientId,
          redirect_uri: redirectUri,
          scope,
          state,
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod,
          refresh_token: refreshToken
        })
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(`Issue code failed: ${res.status} ${txt}`)
      }
      const payload = await res.json()
      window.location.href = payload.redirect
    } catch (e: any) {
      setError(String(e?.message || e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: '4rem auto', padding: 24, border: '1px solid #e5e7eb', borderRadius: 12, fontFamily: 'system-ui, -apple-system' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>授权访问 ZephyrOS</h1>
      <div style={{ color: '#374151', fontSize: 14, marginBottom: 12 }}>
        客户端请求：<strong>{client_id}</strong>
      </div>
      <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>回调地址：</div>
      <div style={{ color: '#111827', fontSize: 13, wordBreak: 'break-all', marginBottom: 12 }}>{redirect_uri}</div>
      {scope && (
        <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 12 }}>请求权限：{scope}</div>
      )}

      {!isLoggedIn ? (
        <div>
          <div style={{ color: '#ef4444', fontSize: 13, minHeight: 20 }}>{error}</div>
          <button onClick={handleLogin} disabled={loading} style={{ padding: '8px 12px', background: '#111827', color: '#fff', borderRadius: 8 }}>
            使用 Google 登录
          </button>
        </div>
      ) : (
        <div>
          <div style={{ color: '#16a34a', fontSize: 13, marginBottom: 8 }}>已登录：{email}</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={handleApprove} disabled={loading} style={{ padding: '8px 12px', background: '#111827', color: '#fff', borderRadius: 8 }}>
              同意并继续
            </button>
            <a href={redirect_uri} style={{ padding: '8px 12px', background: '#e5e7eb', color: '#111827', borderRadius: 8 }}>拒绝</a>
          </div>
          <div style={{ color: '#ef4444', fontSize: 13, minHeight: 20, marginTop: 8 }}>{error}</div>
        </div>
      )}
    </div>
  )
}

export default function OAuthAuthorizePage() {
  return (
    <Suspense fallback={<div style={{ maxWidth: 520, margin: '4rem auto', padding: 24, textAlign: 'center' }}>Loading...</div>}>
      <OAuthAuthorizeContent />
    </Suspense>
  )
}


