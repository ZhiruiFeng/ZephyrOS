import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/auth'
import { resolveApiKey } from '@/lib/api-key-resolver'

// Internal endpoint to resolve the user's ElevenLabs API key.
// Note: Intentionally DOES NOT include CORS headers to prevent browser access.
// Server-to-server fetches are not subject to CORS.

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const service = searchParams.get('service') || undefined

    const resolved = await resolveApiKey(user.id, 'elevenlabs', service)
    if (!resolved) {
      return NextResponse.json({ error: 'No ElevenLabs API key configured' }, { status: 404 })
    }

    // Return the raw key for server-side use only
    return NextResponse.json({
      key: resolved.key,
      source: resolved.source,
      keyId: resolved.keyId
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resolve ElevenLabs API key'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}