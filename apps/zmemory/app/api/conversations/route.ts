import { NextRequest, NextResponse } from 'next/server'
import { supabaseSessionManager } from '../../../lib/supabase-session-manager'

export const dynamic = 'force-dynamic'

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
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    const sessions = await supabaseSessionManager.getUserSessions(userId, limit, includeArchived)
    
    return NextResponse.json({
      success: true,
      conversations: sessions,
      count: sessions.length
    })

  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
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
      return NextResponse.json(
        { error: 'userId and agentId are required' },
        { status: 400 }
      )
    }

    const session = await supabaseSessionManager.createSession(userId, agentId, title)

    return NextResponse.json({
      success: true,
      conversation: session
    })

  } catch (error) {
    console.error('Error creating conversation:', error)
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
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
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }

    // Verify ownership if userId provided
    if (userId) {
      const session = await supabaseSessionManager.getSession(sessionId, userId)
      if (!session) {
        return NextResponse.json(
          { error: 'Conversation not found or access denied' },
          { status: 404 }
        )
      }
    }

    await supabaseSessionManager.deleteSession(sessionId)

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting conversation:', error)
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    )
  }
}