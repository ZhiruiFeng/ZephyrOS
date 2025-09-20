import { NextRequest } from 'next/server'
import { resolveZmemoryOrigin } from '../../../lib/zmemory-api-base'

export function getZmemoryBase(): string {
  return resolveZmemoryOrigin('http://localhost:3001') || 'http://localhost:3001'
}

// Resolve the user's ElevenLabs key via the zmemory backend internal endpoint.
// Requires an Authorization Bearer token on the incoming request.
export async function resolveUserElevenLabsKey(
  req: NextRequest,
  service: string = 'elevenlabs_stt'
): Promise<string | null> {
  try {
    const auth = req.headers.get('authorization') || req.headers.get('Authorization')
    if (!auth) return null
    const base = getZmemoryBase()
    const res = await fetch(
      `${base}/api/internal/resolve-elevenlabs-key?service=${encodeURIComponent(service)}`,
      {
        headers: { Authorization: auth },
        method: 'GET',
      }
    )
    if (!res.ok) return null
    const data = await res.json().catch(() => null)
    return data?.key || null
  } catch {
    return null
  }
}
