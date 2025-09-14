import { NextRequest, NextResponse } from 'next/server'
import { supabaseSessionManager } from '../../../../lib/supabase-session-manager'

export const dynamic = 'force-dynamic'

/**
 * GET /api/conversations/search - Search messages across user's conversation history
 * Query params:
 *   - userId: string (required)
 *   - q: string (search query, required)
 *   - limit?: number (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    if (!query) {
      return NextResponse.json(
        { error: 'search query (q) is required' },
        { status: 400 }
      )
    }

    const results = await supabaseSessionManager.searchMessages(userId, query, limit)

    return NextResponse.json({
      success: true,
      query,
      results,
      count: results.length
    })

  } catch (error) {
    console.error('Error searching conversations:', error)
    return NextResponse.json(
      { error: 'Failed to search conversations' },
      { status: 500 }
    )
  }
}