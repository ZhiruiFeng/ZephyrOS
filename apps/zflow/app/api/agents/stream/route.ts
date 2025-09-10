import { NextRequest } from 'next/server'
import { StreamingService } from '../../../lib/agents/streaming'
import { sessionManager } from '../../../lib/agents/session-manager'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return new Response('sessionId is required', { status: 400 })
  }

  // Verify session exists
  const session = await sessionManager.getSession(sessionId)
  if (!session) {
    return new Response('Session not found', { status: 404 })
  }

  // Extend session TTL since user is actively using it
  await sessionManager.extendSessionTTL(sessionId)

  const streamingService = new StreamingService()
  const stream = streamingService.createSSEStream(sessionId)

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  })
}