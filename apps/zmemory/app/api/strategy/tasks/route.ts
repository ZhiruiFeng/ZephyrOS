import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserIdFromRequest, createClientForRequest } from '../../../../lib/auth'
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '../../../../lib/security'
import { z } from 'zod'

// Server-side Supabase client using service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

// =====================================================
// TYPES & VALIDATION SCHEMAS
// =====================================================

const TaskStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'blocked'])
const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'])
const StrategicImportanceSchema = z.enum(['low', 'medium', 'high', 'critical'])

const CreateStrategyTaskSchema = z.object({
  initiative_id: z.string().uuid('Initiative ID is required'),
  task_id: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: TaskStatusSchema.default('pending'),
  priority: TaskPrioritySchema.default('medium'),
  progress: z.number().min(0).max(100).default(0),
  estimated_duration: z.number().positive().optional(), // minutes
  actual_duration: z.number().positive().optional(), // minutes
  assignee: z.string().optional(), // 'me' or 'ai_agent'
  due_date: z.string().optional(),
  completion_date: z.string().optional(),
  tags: z.array(z.string()).default([]),
  strategic_importance: StrategicImportanceSchema.default('medium'),
  initiative_contribution_weight: z.number().min(1).max(10).default(1),
  metadata: z.record(z.any()).default({})
})

const QueryStrategyTaskSchema = z.object({
  initiative_id: z.string().uuid().optional(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  assignee: z.string().optional(),
  strategic_importance: StrategicImportanceSchema.optional(),
  search: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  due_before: z.string().optional(),
  due_after: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sort_by: z.enum(['created_at', 'updated_at', 'title', 'priority', 'due_date', 'progress', 'strategic_importance']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
})

type StrategyTask = {
  id: string
  user_id: string
  initiative_id: string
  task_id: string | null
  title: string
  description: string | null
  status: z.infer<typeof TaskStatusSchema>
  priority: z.infer<typeof TaskPrioritySchema>
  progress: number
  estimated_duration: number | null
  actual_duration: number | null
  assignee: string | null
  due_date: string | null
  completion_date: string | null
  tags: string[]
  strategic_importance: z.infer<typeof StrategicImportanceSchema>
  initiative_contribution_weight: number
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  // Joined data
  initiative?: { id: string; title: string; status: string } | null
  regular_task?: { id: string; title: string; status: string } | null
  ai_delegation?: {
    ai_task_id: string
    agent_name: string
    agent_vendor: string
    status: string
    mode: string
    assigned_at: string
    started_at?: string
    completed_at?: string
  } | null
}

// =====================================================
// OPTIONS handler for CORS
// =====================================================
export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request)
}

// =====================================================
// GET /api/strategy/tasks
// Get all strategic tasks for the authenticated user
// =====================================================
/**
 * @swagger
 * /api/strategy/tasks:
 *   get:
 *     summary: Get strategic tasks
 *     description: Retrieve strategic tasks with optional filtering and sorting
 *     tags: [Strategy]
 *     parameters:
 *       - in: query
 *         name: initiative_id
 *         schema:
 *           type: string
 *         description: Filter by initiative UUID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, completed, cancelled, blocked]
 *         description: Filter by task status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         description: Filter by task priority
 *       - in: query
 *         name: assignee
 *         schema:
 *           type: string
 *         description: Filter by assignee ('me' or 'ai_agent')
 *       - in: query
 *         name: strategic_importance
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Filter by strategic importance
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Filter by tags (comma-separated)
 *       - in: query
 *         name: due_before
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Tasks due before this date
 *       - in: query
 *         name: due_after
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Tasks due after this date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Maximum number of tasks to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *         description: Number of tasks to skip
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [created_at, updated_at, title, priority, due_date, progress, strategic_importance]
 *           default: created_at
 *         description: Field to sort by
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of strategic tasks
 *       400:
 *         description: Invalid query parameters
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

    const { searchParams } = new URL(request.url)

    // Parse and validate query parameters
    const queryResult = QueryStrategyTaskSchema.safeParse(Object.fromEntries(searchParams))
    if (!queryResult.success) {
      return jsonWithCors(request, {
        error: 'Invalid query parameters',
        details: queryResult.error.errors
      }, 400)
    }

    const query = queryResult.data
    const client = createClientForRequest(request) || supabase

    // Build Supabase query with AI delegation info
    let dbQuery = client
      .from('core_strategy_tasks')
      .select(`
        *,
        initiative:core_strategy_initiatives(id, title, status),
        regular_task:tasks(id, title, status)
      `)
      .eq('user_id', userId)

    // Apply filters
    if (query.initiative_id) {
      dbQuery = dbQuery.eq('initiative_id', query.initiative_id)
    }
    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status)
    }
    if (query.priority) {
      dbQuery = dbQuery.eq('priority', query.priority)
    }
    if (query.assignee) {
      dbQuery = dbQuery.eq('assignee', query.assignee)
    }
    if (query.strategic_importance) {
      dbQuery = dbQuery.eq('strategic_importance', query.strategic_importance)
    }
    if (query.search) {
      dbQuery = dbQuery.or(`title.ilike.%${query.search}%,description.ilike.%${query.search}%`)
    }
    if (query.tags) {
      const filterTags = query.tags.split(',').map(tag => tag.trim())
      dbQuery = dbQuery.overlaps('tags', filterTags)
    }
    if (query.due_before) {
      dbQuery = dbQuery.lte('due_date', query.due_before)
    }
    if (query.due_after) {
      dbQuery = dbQuery.gte('due_date', query.due_after)
    }

    // Apply sorting
    const ascending = query.sort_order === 'asc'
    if (query.sort_by === 'title') {
      dbQuery = dbQuery.order('title', { ascending })
    } else if (query.sort_by === 'due_date') {
      dbQuery = dbQuery.order('due_date', { ascending, nullsFirst: false })
    } else if (query.sort_by === 'priority') {
      dbQuery = dbQuery.order('priority', { ascending })
    } else if (query.sort_by === 'strategic_importance') {
      dbQuery = dbQuery.order('strategic_importance', { ascending })
    } else {
      dbQuery = dbQuery.order(query.sort_by, { ascending })
    }

    // Apply pagination
    dbQuery = dbQuery.range(query.offset, query.offset + query.limit - 1)

    const { data: tasks, error } = await dbQuery

    if (error) {
      console.error('Database error:', error)
      return jsonWithCors(request, { error: 'Failed to fetch strategic tasks' }, 500)
    }

    // For tasks with AI delegation, fetch AI task details
    const tasksWithAI: StrategyTask[] = []

    for (const task of tasks || []) {
      let aiDelegation = null

      if (task.assignee === 'ai_agent' && task.task_id) {
        // Fetch AI delegation info from ai_tasks table
        const { data: aiTaskData } = await client
          .from('ai_tasks')
          .select(`
            id,
            status,
            mode,
            assigned_at,
            started_at,
            completed_at,
            agent_id,
            vendor_id
          `)
          .eq('task_id', task.task_id)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (aiTaskData) {
          // Fetch agent and vendor info separately to avoid GROUP BY issues
          let agentName = 'Unknown Agent'
          let vendorName = 'Unknown Vendor'

          if (aiTaskData.agent_id) {
            const { data: agentData } = await client
              .from('ai_agents')
              .select('name, vendor_id')
              .eq('id', aiTaskData.agent_id)
              .single()

            if (agentData) {
              agentName = agentData.name

              if (agentData.vendor_id) {
                const { data: vendorData } = await client
                  .from('vendors')
                  .select('name')
                  .eq('id', agentData.vendor_id)
                  .single()

                if (vendorData) {
                  vendorName = vendorData.name
                }
              }
            }
          }

          aiDelegation = {
            ai_task_id: aiTaskData.id,
            agent_name: agentName,
            agent_vendor: vendorName,
            status: aiTaskData.status,
            mode: aiTaskData.mode,
            assigned_at: aiTaskData.assigned_at,
            started_at: aiTaskData.started_at,
            completed_at: aiTaskData.completed_at
          }
        }
      }

      tasksWithAI.push({
        id: task.id,
        user_id: task.user_id,
        initiative_id: task.initiative_id,
        task_id: task.task_id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        progress: task.progress,
        estimated_duration: task.estimated_duration,
        actual_duration: task.actual_duration,
        assignee: task.assignee,
        due_date: task.due_date,
        completion_date: task.completion_date,
        tags: task.tags || [],
        strategic_importance: task.strategic_importance,
        initiative_contribution_weight: task.initiative_contribution_weight,
        metadata: task.metadata || {},
        created_at: task.created_at,
        updated_at: task.updated_at,
        initiative: task.initiative || null,
        regular_task: task.regular_task || null,
        ai_delegation: aiDelegation
      })
    }

    return jsonWithCors(request, tasksWithAI)
  } catch (error) {
    console.error('API error:', error)
    const errorMessage = sanitizeErrorMessage(error)
    return jsonWithCors(request, { error: errorMessage }, 500)
  }
}

// =====================================================
// POST /api/strategy/tasks
// Create a new strategic task
// =====================================================
/**
 * @swagger
 * /api/strategy/tasks:
 *   post:
 *     summary: Create a new strategic task
 *     description: Create a new strategic task for the authenticated user
 *     tags: [Strategy]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - initiative_id
 *               - title
 *             properties:
 *               initiative_id:
 *                 type: string
 *                 format: uuid
 *                 description: Parent initiative UUID
 *               task_id:
 *                 type: string
 *                 format: uuid
 *                 description: Linked regular task UUID (optional)
 *               title:
 *                 type: string
 *                 description: Task title
 *               description:
 *                 type: string
 *                 description: Detailed description
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed, cancelled, blocked]
 *                 default: pending
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 default: medium
 *               progress:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *                 default: 0
 *               estimated_duration:
 *                 type: integer
 *                 description: Estimated duration in minutes
 *               assignee:
 *                 type: string
 *                 description: Task assignee ('me' or 'ai_agent')
 *               due_date:
 *                 type: string
 *                 format: date
 *               strategic_importance:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 default: medium
 *               initiative_contribution_weight:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *                 default: 1
 *                 description: Weight for calculating initiative progress
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               metadata:
 *                 type: object
 *           example:
 *             initiative_id: "123e4567-e89b-12d3-a456-426614174000"
 *             title: "Research market opportunities"
 *             description: "Analyze target market segments and competitive landscape"
 *             priority: "high"
 *             strategic_importance: "critical"
 *             assignee: "me"
 *             due_date: "2024-12-31"
 *             tags: ["research", "analysis", "market"]
 *     responses:
 *       201:
 *         description: Strategic task created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request)
    if (isRateLimited(clientIP, 15 * 60 * 1000, 30)) { // Stricter limit for POST
      return jsonWithCors(request, { error: 'Too many requests' }, 429)
    }

    if (!supabase) {
      return jsonWithCors(request, { error: 'Database connection not available' }, 503)
    }

    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return jsonWithCors(request, { error: 'Authentication required' }, 401)
    }

    const body = await request.json()

    // Validate request body
    const validationResult = CreateStrategyTaskSchema.safeParse(body)
    if (!validationResult.success) {
      return jsonWithCors(request, {
        error: 'Invalid strategic task data',
        details: validationResult.error.errors
      }, 400)
    }

    const taskData = validationResult.data
    const client = createClientForRequest(request) || supabase

    // Verify that the initiative exists and belongs to the user
    const { data: initiative, error: initiativeError } = await client
      .from('core_strategy_initiatives')
      .select('id')
      .eq('id', taskData.initiative_id)
      .eq('user_id', userId)
      .single()

    if (initiativeError || !initiative) {
      return jsonWithCors(request, { error: 'Initiative not found or access denied' }, 404)
    }

    // Prepare insert payload
    const insertPayload = {
      user_id: userId,
      initiative_id: taskData.initiative_id,
      task_id: taskData.task_id || null,
      title: taskData.title,
      description: taskData.description || null,
      status: taskData.status,
      priority: taskData.priority,
      progress: taskData.progress,
      estimated_duration: taskData.estimated_duration || null,
      actual_duration: taskData.actual_duration || null,
      assignee: taskData.assignee || null,
      due_date: taskData.due_date || null,
      completion_date: taskData.completion_date || null,
      tags: taskData.tags,
      strategic_importance: taskData.strategic_importance,
      initiative_contribution_weight: taskData.initiative_contribution_weight,
      metadata: taskData.metadata
    }

    // If creating with completed status and no explicit completion_date, set it to now
    if (insertPayload.status === 'completed' && !insertPayload.completion_date) {
      insertPayload.completion_date = new Date().toISOString()
    }

    const { data, error } = await client
      .from('core_strategy_tasks')
      .insert(insertPayload)
      .select(`
        *,
        initiative:core_strategy_initiatives(id, title, status),
        regular_task:tasks(id, title, status)
      `)
      .single()

    if (error) {
      console.error('Database error:', error)
      return jsonWithCors(request, { error: 'Failed to create strategic task' }, 500)
    }

    const strategyTask: StrategyTask = {
      id: data.id,
      user_id: data.user_id,
      initiative_id: data.initiative_id,
      task_id: data.task_id,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      progress: data.progress,
      estimated_duration: data.estimated_duration,
      actual_duration: data.actual_duration,
      assignee: data.assignee,
      due_date: data.due_date,
      completion_date: data.completion_date,
      tags: data.tags || [],
      strategic_importance: data.strategic_importance,
      initiative_contribution_weight: data.initiative_contribution_weight,
      metadata: data.metadata || {},
      created_at: data.created_at,
      updated_at: data.updated_at,
      initiative: data.initiative || null,
      regular_task: data.regular_task || null,
      ai_delegation: null
    }

    return jsonWithCors(request, strategyTask, 201)
  } catch (error) {
    console.error('API error:', error)
    const errorMessage = sanitizeErrorMessage(error)
    return jsonWithCors(request, { error: errorMessage }, 500)
  }
}