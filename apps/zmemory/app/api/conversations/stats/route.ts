import { NextRequest, NextResponse } from 'next/server'
import { supabaseSessionManager } from '../../../../lib/supabase-session-manager'
import { jsonWithCors, createOptionsResponse } from '../../../../lib/security'

export const dynamic = 'force-dynamic'

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request)
}

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
      return jsonWithCors(request, { error: 'userId is required' }, 400)
    }

    const stats = await supabaseSessionManager.getSessionStats(userId)

    return jsonWithCors(request, {
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
    return jsonWithCors(request, { error: 'Failed to fetch conversation statistics' }, 500)
  }
}
