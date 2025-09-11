"use client"

import React from 'react'
import { getAuthHeader } from '../../../lib/supabase'

export default function ResolveOpenAIKeyTestPage() {
  const [service, setService] = React.useState('openai_whisper')
  const [loading, setLoading] = React.useState(false)
  const [result, setResult] = React.useState<any>(null)
  const [error, setError] = React.useState<string | null>(null)

  const runTest = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const headers = await getAuthHeader()
      const res = await fetch(`/api/debug/resolve-openai-key?service=${encodeURIComponent(service)}`, {
        method: 'GET',
        headers,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Request failed')
      setResult(data)
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }, [service])

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Resolve OpenAI Key Test</h1>
      <p className="text-gray-600">
        This page calls the internal resolver via a debug API route to check if a user-stored key is available.
        Ensure you are signed in so the Authorization header is present.
      </p>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Service</label>
        <input
          className="border rounded-md px-3 py-2 text-sm w-64"
          value={service}
          onChange={(e) => setService(e.target.value)}
          placeholder="openai_whisper"
        />
        <button
          onClick={runTest}
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-2 text-white text-sm disabled:opacity-50"
        >
          {loading ? 'Checking…' : 'Check Key'}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Error: {error}
        </div>
      )}

      {result && (
        <div className="rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-800">
          <div><span className="font-medium">Service:</span> {result.service}</div>
          <div><span className="font-medium">Found:</span> {String(result.found)}</div>
          {result.preview && (
            <div><span className="font-medium">Preview:</span> {result.preview}</div>
          )}
        </div>
      )}

      <div className="text-xs text-gray-500">
        Note: Only a masked preview is returned for safety. The resolver requires an Authorization header from your session.
      </div>
    </div>
  )
}
