import { NextRequest, NextResponse } from 'next/server'
import { supabaseSessionManager } from '../../../../lib/supabase-session-manager'

export const dynamic = 'force-dynamic'

/**
 * GET /api/conversations/[sessionId] - Get specific conversation with messages
 * Query params:
 *   - userId?: string (for access control)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const userId = request.nextUrl.searchParams.get('userId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }

    const session = await supabaseSessionManager.getSession(sessionId, userId || undefined)

    if (!session) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      conversation: session
    })

  } catch (error) {
    console.error('Error fetching conversation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/conversations/[sessionId] - Update conversation metadata
 * Body: { title?: string, summary?: string, isArchived?: boolean }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const updates = await request.json()
    const userId = updates.userId // For access control

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }

    // Get existing session
    const existingSession = await supabaseSessionManager.getSession(sessionId, userId)
    
    if (!existingSession) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Update session with new metadata
    const updatedSession = {
      ...existingSession,
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.summary !== undefined && { summary: updates.summary }),
      ...(updates.isArchived !== undefined && { isArchived: updates.isArchived }),
      updatedAt: new Date()
    }

    await supabaseSessionManager.saveSession(updatedSession)

    return NextResponse.json({
      success: true,
      conversation: updatedSession
    })

  } catch (error) {
    console.error('Error updating conversation:', error)
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/conversations/[sessionId] - Delete specific conversation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const body = await request.json().catch(() => ({}))
    const userId = body.userId

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