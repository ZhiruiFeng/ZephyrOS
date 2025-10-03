import { NextResponse } from 'next/server'
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware'
import { supabaseServer } from '@/lib/config/supabase-server'

export const dynamic = 'force-dynamic';

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
async function handleGet(request: EnhancedRequest): Promise<NextResponse> {
  const userId = request.userId!;

  if (!supabaseServer) {
    return NextResponse.json({ error: 'Database connection not available' }, { status: 503 });
  }

  // Fetch dashboard data using direct queries
  let dashboardData: StrategyDashboard = {
    active_season: null,
    active_initiatives: [],
    recent_memories: [],
    agent_workload: []
  }

  try {
    // 1. Get active season
    const { data: seasonData } = await supabaseServer
      .from('seasons')
      .select('id, title, intention, theme')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (seasonData) {
      // Calculate season progress from initiatives
      const { data: initiativeProgress } = await supabaseServer
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
    const { data: initiativesData } = await supabaseServer
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
        const { count: taskCount } = await supabaseServer
          .from('core_strategy_tasks')
          .select('*', { count: 'exact' })
          .eq('initiative_id', initiative.id)

        const { count: completedTaskCount } = await supabaseServer
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
      const { data: memoriesData } = await supabaseServer
        .from('core_strategy_memories')
        .select('id, title, content, memory_type, importance_level, is_highlight, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (memoriesData) {
        dashboardData.recent_memories = memoriesData
      }
    } catch (memoryError) {
      dashboardData.recent_memories = []
    }

    // 4. Get agent workload (fallback to empty array if issues)
    try {
      const { data: agentsData } = await supabaseServer
        .from('ai_agents')
        .select('id, name')
        .eq('user_id', userId)

      if (agentsData) {
        for (const agent of agentsData) {
          const { count: activeCount } = await supabaseServer
            .from('ai_tasks')
            .select('*', { count: 'exact' })
            .eq('agent_id', agent.id)
            .eq('user_id', userId)
            .in('status', ['assigned', 'in_progress'])

          const { count: completedCount } = await supabaseServer
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
      dashboardData.agent_workload = []
    }

  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    // Return partial data instead of failing completely
  }

  return NextResponse.json(dashboardData);
}

export const GET = withStandardMiddleware(handleGet, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 300
  }
});

export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';