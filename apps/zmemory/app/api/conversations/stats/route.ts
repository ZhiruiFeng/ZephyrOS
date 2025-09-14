import { NextRequest, NextResponse } from 'next/server'
import { supabaseSessionManager } from '../../../../lib/supabase-session-manager'

export const dynamic = 'force-dynamic'

/**
 * GET /api/conversations/stats - Get user's conversation statistics
 * Query params:
 *   - userId: string (required)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    const stats = await supabaseSessionManager.getSessionStats(userId)

    return NextResponse.json({
      success: true,
      stats: {
        totalConversations: stats.totalSessions,
        totalMessages: stats.totalMessages,
        archivedConversations: stats.archivedSessions,
        activeConversations: stats.totalSessions - stats.archivedSessions
      }
    })

  } catch (error) {
    console.error('Error fetching conversation stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversation statistics' },
      { status: 500 }
    )
  }
}