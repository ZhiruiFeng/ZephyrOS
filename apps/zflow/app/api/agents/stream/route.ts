import { NextRequest } from 'next/server'
import { StreamingService } from '@/agents/server'
import { sessionManager } from '@/agents/server'

// 禁用静态生成，因为需要运行时 Redis 连接
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return new Response('sessionId is required', { status: 400 })
  }

  // Verify session exists with brief retry for eventual consistency
  let session = await sessionManager.getSession(sessionId)
  if (!session) {
    for (let i = 0; i < 10; i++) { // up to ~1s total
      await new Promise(r => setTimeout(r, 100))
      session = await sessionManager.getSession(sessionId)
      if (session) break
    }
  }
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
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Nginx: disable buffering
      'X-Buffering': 'no', // Generic: disable buffering
      'Transfer-Encoding': 'chunked', // Enable chunked encoding
      'Pragma': 'no-cache', // HTTP/1.0 compatibility
      'Expires': '0', // Prevent caching
      'Cache-Tag': `agents-stream-${sessionId}`,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  })
}
