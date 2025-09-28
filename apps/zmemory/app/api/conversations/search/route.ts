import { NextRequest, NextResponse } from 'next/server'
import { supabaseSessionManager } from '@/lib/supabase-session-manager'
import { jsonWithCors, createOptionsResponse } from '@/lib/security'

export const dynamic = 'force-dynamic'

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request)
}

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
      return jsonWithCors(request, { error: 'userId is required' }, 400)
    }

    if (!query) {
      return jsonWithCors(request, { error: 'search query (q) is required' }, 400)
    }

    const results = await supabaseSessionManager.searchMessages(userId, query, limit)

    return jsonWithCors(request, { success: true, query, results, count: results.length })

  } catch (error) {
    console.error('Error searching conversations:', error)
    return jsonWithCors(request, { error: 'Failed to search conversations' }, 500)
  }
}
