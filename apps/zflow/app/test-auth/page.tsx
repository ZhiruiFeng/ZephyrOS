'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestAuthPage() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      if (!supabase) {
        console.error('Supabase client is null!')
        setLoading(false)
        return
      }

      const { data, error } = await supabase.auth.getSession()
      console.log('=== AUTH TEST ===')
      console.log('Session:', data.session)
      console.log('Error:', error)
      console.log('User ID:', data.session?.user?.id)
      console.log('Access Token:', data.session?.access_token?.substring(0, 50) + '...')

      setSession(data.session)
      setLoading(false)
    }

    checkAuth()
  }, [])

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Auth Test Page</h1>

      {session ? (
        <div className="bg-green-100 p-4 rounded">
          <h2 className="font-bold text-green-800 mb-2">✅ Logged In</h2>
          <p><strong>User ID:</strong> {session.user?.id}</p>
          <p><strong>Email:</strong> {session.user?.email}</p>
          <p><strong>Token:</strong> {session.access_token?.substring(0, 50)}...</p>
        </div>
      ) : (
        <div className="bg-red-100 p-4 rounded">
          <h2 className="font-bold text-red-800 mb-2">❌ Not Logged In</h2>
          <p>No active Supabase session found</p>
        </div>
      )}

      <div className="mt-4">
        <button
          onClick={async () => {
            if (!supabase) return
            const headers = await import('@/lib/auth-manager').then(m => m.authManager.getAuthHeaders())
            console.log('Auth Headers:', headers)
            alert(JSON.stringify(headers, null, 2))
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Test Auth Headers
        </button>
      </div>
    </div>
  )
}
