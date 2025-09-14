import { NextRequest, NextResponse } from 'next/server'
import { supabaseSessionManager } from '../../../lib/supabase-session-manager'
import { jsonWithCors, createOptionsResponse } from '../../../lib/security'

export const dynamic = 'force-dynamic'

/**
 * OPTIONS - Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request)
}

/**
 * GET /api/conversations - Get user's conversation history
 * Query params:
 *   - userId: string (required)
 *   - limit?: number (default: 50)
 *   - includeArchived?: boolean (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const includeArchived = searchParams.get('includeArchived') === 'true'

    if (!userId) {
      return jsonWithCors(request, 
        { error: 'userId is required' },
        400
      )
    }

    const sessions = await supabaseSessionManager.getUserSessions(userId, limit, includeArchived)
    
    return jsonWithCors(request, {
      success: true,
      conversations: sessions,
      count: sessions.length
    })

  } catch (error) {
    console.error('Error fetching conversations:', error)
    return jsonWithCors(request,
      { error: 'Failed to fetch conversations' },
      500
    )
  }
}

/**
 * POST /api/conversations - Create a new conversation
 * Body: { userId: string, agentId: string, title?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, agentId, title } = await request.json()

    if (!userId || !agentId) {
      return jsonWithCors(request,
        { error: 'userId and agentId are required' },
        400
      )
    }

    const session = await supabaseSessionManager.createSession(userId, agentId, title)

    return jsonWithCors(request, {
      success: true,
      conversation: session
    })

  } catch (error) {
    console.error('Error creating conversation:', error)
    return jsonWithCors(request,
      { error: 'Failed to create conversation' },
      500
    )
  }
}

/**
 * DELETE /api/conversations - Delete a conversation
 * Body: { sessionId: string, userId: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const { sessionId, userId } = await request.json()

    if (!sessionId) {
      return jsonWithCors(request,
        { error: 'sessionId is required' },
        400
      )
    }

    // Verify ownership if userId provided
    if (userId) {
      const session = await supabaseSessionManager.getSession(sessionId, userId)
      if (!session) {
        return jsonWithCors(request,
          { error: 'Conversation not found or access denied' },
          404
        )
      }
    }

    await supabaseSessionManager.deleteSession(sessionId)

    return jsonWithCors(request, {
      success: true,
      message: 'Conversation deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting conversation:', error)
    return jsonWithCors(request,
      { error: 'Failed to delete conversation' },
      500
    )
  }
}