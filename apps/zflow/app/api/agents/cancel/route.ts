import { NextRequest, NextResponse } from 'next/server'
import { StreamingService } from '../../../lib/agents/streaming'
import { sessionManager } from '../../../lib/agents/session-manager'

// 禁用静态生成，因为需要运行时 Redis 连接
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }

    // Verify session exists
    const session = await sessionManager.getSession(sessionId)
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Cancel the stream
    const streamingService = new StreamingService()
    await streamingService.cancelStream(sessionId)

    return NextResponse.json({ 
      success: true,
      message: 'Stream cancelled successfully'
    })
  } catch (error) {
    console.error('Error cancelling stream:', error)
    return NextResponse.json(
      { error: 'Failed to cancel stream' },
      { status: 500 }
    )
  }
}