import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserIdFromRequest, createClientForRequest } from '../../../../lib/auth'
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '../../../../lib/security'

// Server-side Supabase client using service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

// =====================================================
// TYPES
// =====================================================

type StrategyDashboard = {
  active_season: {
    id: string
    title: string
    intention: string
    theme: string
    progress: number
  } | null
  active_initiatives: Array<{
    id: string
    title: string
    description: string
    status: string
    priority: string
    progress: number
    due_date: string | null
    task_count: number
    completed_task_count: number
  }>
  recent_memories: Array<{
    id: string
    title: string
    content: string
    memory_type: string
    importance_level: string
    is_highlight: boolean
    created_at: string
  }>
  agent_workload: Array<{
    agent_id: string
    agent_name: string
    active_assignments: number
    completed_assignments: number
    avg_satisfaction: number | null
  }>
}

// =====================================================
// OPTIONS handler for CORS
// =====================================================
export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request)
}

// =====================================================
// GET /api/strategy/dashboard
// Get strategic dashboard data for the authenticated user
// =====================================================
/**
 * @swagger
 * /api/strategy/dashboard:
 *   get:
 *     summary: Get strategic dashboard data
 *     description: Retrieve comprehensive dashboard data including active season, initiatives, recent memories, and agent workload
 *     tags: [Strategy]
 *     responses:
 *       200:
 *         description: Strategic dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 active_season:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     intention:
 *                       type: string
 *                     theme:
 *                       type: string
 *                     progress:
 *                       type: number
 *                 active_initiatives:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       status:
 *                         type: string
 *                       priority:
 *                         type: string
 *                       progress:
 *                         type: number
 *                       due_date:
 *                         type: string
 *                         nullable: true
 *                       task_count:
 *                         type: integer
 *                       completed_task_count:
 *                         type: integer
 *                 recent_memories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       content:
 *                         type: string
 *                       memory_type:
 *                         type: string
 *                       importance_level:
 *                         type: string
 *                       is_highlight:
 *                         type: boolean
 *                       created_at:
 *                         type: string
 *                 agent_workload:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       agent_id:
 *                         type: string
 *                       agent_name:
 *                         type: string
 *                       active_assignments:
 *                         type: integer
 *                       completed_assignments:
 *                         type: integer
 *                       avg_satisfaction:
 *                         type: number
 *                         nullable: true
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request)
    if (isRateLimited(clientIP)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429)
    }

    if (!supabase) {
      return jsonWithCors(request, { error: 'Database connection not available' }, 503)
    }

    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return jsonWithCors(request, { error: 'Authentication required' }, 401)
    }

    const client = createClientForRequest(request) || supabase

    // Call the stored procedure to get dashboard data
    const { data, error } = await client
      .rpc('get_strategy_dashboard', { user_uuid: userId })

    if (error) {
      console.error('Database error:', error)
      return jsonWithCors(request, { error: 'Failed to fetch dashboard data' }, 500)
    }

    // The stored procedure returns JSON, so we can use it directly
    const dashboardData: StrategyDashboard = data || {
      active_season: null,
      active_initiatives: [],
      recent_memories: [],
      agent_workload: []
    }

    return jsonWithCors(request, dashboardData)
  } catch (error) {
    console.error('API error:', error)
    const errorMessage = sanitizeErrorMessage(error)
    return jsonWithCors(request, { error: errorMessage }, 500)
  }
}