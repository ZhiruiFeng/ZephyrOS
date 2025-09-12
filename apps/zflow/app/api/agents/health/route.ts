import { NextResponse } from 'next/server'
import { sessionManager } from '../../../lib/agents/session-manager'
import { StreamingService } from '../../../lib/agents/streaming'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const streaming = new StreamingService()
    const modeSession = await sessionManager.getMode()
    const modeStreaming = await streaming.getMode()

    return NextResponse.json({
      ok: true,
      redis_url_present: Boolean(process.env.REDIS_URL),
      session_mode: modeSession,
      streaming_mode: modeStreaming,
    })
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 })
  }
}

