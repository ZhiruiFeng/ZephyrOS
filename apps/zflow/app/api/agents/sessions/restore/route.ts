import { NextRequest, NextResponse } from 'next/server'
import { sessionManager, agentRegistry } from '@/agents/server'

// Disable static generation for Redis connections
export const dynamic = 'force-dynamic'

/**
 * POST /api/agents/sessions/restore - Restore historical session to Redis
 * Used when continuing historical conversations
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId, userId, agentId, messages } = await request.json()

    if (!sessionId || !userId || !agentId) {
      return NextResponse.json(
        { error: 'sessionId, userId, and agentId are required' },
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

    // Check if session already exists in Redis
    const existingSession = await sessionManager.getSession(sessionId)
    if (existingSession) {
      return NextResponse.json({
        success: true,
        sessionId,
        message: 'Session already exists in Redis',
        restored: false
      })
    }

    // Create session in Redis with the same ID
    const session = await sessionManager.createSessionWithId(sessionId, userId, agentId)

    // Add historical messages to Redis session
    if (messages && Array.isArray(messages) && messages.length > 0) {
      for (const message of messages) {
        try {
          const agentMessage = {
            id: message.id,
            type: message.type,
            content: message.content,
            timestamp: new Date(message.timestamp),
            agent: message.agent,
            streaming: false,
            toolCalls: message.toolCalls || []
          }
          await sessionManager.addMessage(sessionId, agentMessage)
        } catch (messageError) {
          console.warn(`Failed to restore message ${message.id}:`, messageError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      sessionId,
      restored: true,
      messagesRestored: messages?.length || 0
    })

  } catch (error) {
    console.error('Error restoring session:', error)
    return NextResponse.json(
      { error: 'Failed to restore session' },
      { status: 500 }
    )
  }
}