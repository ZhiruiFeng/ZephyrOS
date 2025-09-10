import { NextRequest, NextResponse } from 'next/server'
import { sessionManager } from '../../../lib/agents/session-manager'
import { agentRegistry } from '../../../lib/agents/registry'

// 禁用静态生成，因为需要运行时 Redis 连接
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { agentId, userId } = await request.json()

    if (!agentId || !userId) {
      return NextResponse.json(
        { error: 'agentId and userId are required' },
        { status: 400 }
      )
    }

    // Validate agent exists
    const agent = agentRegistry.getAgent(agentId)
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // Create new session
    const session = await sessionManager.createSession(userId, agentId)

    return NextResponse.json({
      sessionId: session.id,
      agentId: session.agentId,
      createdAt: session.createdAt,
      agent: agent
    })
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('sessionId')
    const userId = searchParams.get('userId')

    if (sessionId) {
      // Get specific session
      const session = await sessionManager.getSession(sessionId)
      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        )
      }

      const agent = agentRegistry.getAgent(session.agentId)
      return NextResponse.json({
        ...session,
        agent
      })
    } else if (userId) {
      // Get user sessions
      const sessions = await sessionManager.getUserSessions(userId)
      const sessionsWithAgents = sessions.map(session => ({
        ...session,
        agent: agentRegistry.getAgent(session.agentId)
      }))

      return NextResponse.json({ sessions: sessionsWithAgents })
    } else {
      return NextResponse.json(
        { error: 'sessionId or userId is required' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error getting session:', error)
    return NextResponse.json(
      { error: 'Failed to get session' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }

    await sessionManager.deleteSession(sessionId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting session:', error)
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    )
  }
}