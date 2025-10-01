import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserIdFromRequest, getClientForAuthType } from '@/auth'
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '@/lib/security'

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
    // Rate limiting - more permissive for dashboard data
    const clientIP = getClientIP(request)
    if (isRateLimited(clientIP, 15 * 60 * 1000, 300)) { // 300 requests per 15 minutes
      return jsonWithCors(request, { error: 'Too many requests' }, 429)
    }

    if (!supabase) {
      return jsonWithCors(request, { error: 'Database connection not available' }, 503)
    }

    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return jsonWithCors(request, { error: 'Authentication required' }, 401)
    }

    const client = await getClientForAuthType(request) || supabase

    // Fetch dashboard data using direct queries
    let dashboardData: StrategyDashboard = {
      active_season: null,
      active_initiatives: [],
      recent_memories: [],
      agent_workload: []
    }

    try {
      // 1. Get active season
      const { data: seasonData } = await client
        .from('seasons')
        .select('id, title, intention, theme')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (seasonData) {
        // Calculate season progress from initiatives
        const { data: initiativeProgress } = await client
          .from('core_strategy_initiatives')
          .select('progress')
          .eq('season_id', seasonData.id)
          .eq('user_id', userId)

        const avgProgress = initiativeProgress && initiativeProgress.length > 0
          ? Math.round(initiativeProgress.reduce((sum, init) => sum + (init.progress || 0), 0) / initiativeProgress.length)
          : 0

        dashboardData.active_season = {
          id: seasonData.id,
          title: seasonData.title,
          intention: seasonData.intention,
          theme: seasonData.theme,
          progress: avgProgress
        }
      }

      // 2. Get active initiatives
      const { data: initiativesData } = await client
        .from('core_strategy_initiatives')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['planning', 'active'])
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10)

      if (initiativesData) {
        for (const initiative of initiativesData) {
          // Get task counts for each initiative
          const { count: taskCount } = await client
            .from('core_strategy_tasks')
            .select('*', { count: 'exact' })
            .eq('initiative_id', initiative.id)

          const { count: completedTaskCount } = await client
            .from('core_strategy_tasks')
            .select('*', { count: 'exact' })
            .eq('initiative_id', initiative.id)
            .eq('status', 'completed')

          dashboardData.active_initiatives.push({
            id: initiative.id,
            title: initiative.title,
            description: initiative.description || '',
            status: initiative.status,
            priority: initiative.priority,
            progress: initiative.progress,
            due_date: initiative.due_date,
            task_count: taskCount || 0,
            completed_task_count: completedTaskCount || 0
          })
        }
      }

      // 3. Get recent memories (fallback to empty array if table doesn't exist)
      try {
        const { data: memoriesData } = await client
          .from('core_strategy_memories')
          .select('id, title, content, memory_type, importance_level, is_highlight, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5)

        if (memoriesData) {
          dashboardData.recent_memories = memoriesData
        }
      } catch (memoryError) {
        console.log('Strategy memories table not available, using empty array')
        dashboardData.recent_memories = []
      }

      // 4. Get agent workload (fallback to empty array if issues)
      try {
        const { data: agentsData } = await client
          .from('ai_agents')
          .select('id, name')
          .eq('user_id', userId)

        if (agentsData) {
          for (const agent of agentsData) {
            const { count: activeCount } = await client
              .from('ai_tasks')
              .select('*', { count: 'exact' })
              .eq('agent_id', agent.id)
              .eq('user_id', userId)
              .in('status', ['assigned', 'in_progress'])

            const { count: completedCount } = await client
              .from('ai_tasks')
              .select('*', { count: 'exact' })
              .eq('agent_id', agent.id)
              .eq('user_id', userId)
              .eq('status', 'completed')

            dashboardData.agent_workload.push({
              agent_id: agent.id,
              agent_name: agent.name,
              active_assignments: activeCount || 0,
              completed_assignments: completedCount || 0,
              avg_satisfaction: null
            })
          }
        }
      } catch (agentError) {
        console.log('Agent workload data not available, using empty array')
        dashboardData.agent_workload = []
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      // Return partial data instead of failing completely
    }

    return jsonWithCors(request, dashboardData)
  } catch (error) {
    console.error('API error:', error)
    const errorMessage = sanitizeErrorMessage(error)
    return jsonWithCors(request, { error: errorMessage }, 500)
  }
}