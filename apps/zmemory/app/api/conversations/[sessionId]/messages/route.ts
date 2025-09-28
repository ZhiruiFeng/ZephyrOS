import { NextRequest } from 'next/server'
import { supabaseSessionManager } from '@/lib/supabase-session-manager'
import { jsonWithCors, createOptionsResponse } from '@/lib/security'

export const dynamic = 'force-dynamic'

/**
 * OPTIONS - Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request)
}

/**
 * POST /api/conversations/[sessionId]/messages - Add messages to existing conversation
 * Body: { userId: string, messages: AgentMessage[] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const { userId, messages } = await request.json()

    if (!sessionId || !userId || !messages || !Array.isArray(messages)) {
      return jsonWithCors(request, {
        error: 'sessionId, userId, and messages array are required'
      }, 400)
    }

    // Verify session exists and user has access
    const existingSession = await supabaseSessionManager.getSession(sessionId, userId)
    if (!existingSession) {
      return jsonWithCors(request, {
        error: 'Conversation not found or access denied'
      }, 404)
    }

    // Add messages to the session
    let successCount = 0
    for (const message of messages) {
      try {
        await supabaseSessionManager.addMessage(sessionId, {
          id: message.id,
          type: message.type,
          content: message.content,
          timestamp: new Date(message.timestamp),
          agent: message.agent,
          streaming: false,
          toolCalls: message.toolCalls || []
        })
        successCount++
      } catch (error) {
        console.warn(`Failed to add message ${message.id} to session ${sessionId}:`, error)
      }
    }

    // Get updated session
    const updatedSession = await supabaseSessionManager.getSession(sessionId, userId)

    return jsonWithCors(request, {
      success: true,
      messagesAdded: successCount,
      totalMessages: messages.length,
      conversation: updatedSession
    })

  } catch (error) {
    console.error('Error adding messages to conversation:', error)
    return jsonWithCors(request, {
      error: 'Failed to add messages to conversation'
    }, 500)
  }
}