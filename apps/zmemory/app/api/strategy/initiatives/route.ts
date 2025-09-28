import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserIdFromRequest, createClientForRequest } from '@/auth'
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '@/lib/security'
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

const InitiativeStatusSchema = z.enum(['planning', 'active', 'completed', 'paused', 'cancelled'])
const InitiativePrioritySchema = z.enum(['low', 'medium', 'high', 'critical'])
const ProgressCalculationSchema = z.enum(['manual', 'task_based', 'weighted_tasks'])

const CreateInitiativeSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  anchor_goal: z.string().optional(),
  success_metric: z.string().optional(),
  status: InitiativeStatusSchema.default('planning'),
  priority: InitiativePrioritySchema.default('medium'),
  progress: z.number().min(0).max(100).default(0),
  progress_calculation: ProgressCalculationSchema.default('manual'),
  start_date: z.string().optional(),
  due_date: z.string().optional(),
  completion_date: z.string().optional(),
  season_id: z.string().uuid().optional(),
  category_id: z.string().uuid().optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).default({})
})

const QueryInitiativeSchema = z.object({
  status: InitiativeStatusSchema.optional(),
  priority: InitiativePrioritySchema.optional(),
  season_id: z.string().uuid().optional(),
  search: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sort_by: z.enum(['created_at', 'updated_at', 'title', 'priority', 'due_date', 'progress']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
})

type Initiative = {
  id: string
  user_id: string
  season_id: string | null
  title: string
  description: string | null
  anchor_goal: string | null
  success_metric: string | null
  status: z.infer<typeof InitiativeStatusSchema>
  priority: z.infer<typeof InitiativePrioritySchema>
  progress: number
  progress_calculation: z.infer<typeof ProgressCalculationSchema>
  start_date: string | null
  due_date: string | null
  completion_date: string | null
  tags: string[]
  category_id: string | null
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  // Joined data
  season?: { id: string; title: string; theme: string } | null
  category?: { id: string; name: string; color: string; icon: string } | null
  task_count?: number
  completed_task_count?: number
}

// =====================================================
// OPTIONS handler for CORS
// =====================================================
export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request)
}

// =====================================================
// GET /api/strategy/initiatives
// Get all initiatives for the authenticated user
// =====================================================
/**
 * @swagger
 * /api/strategy/initiatives:
 *   get:
 *     summary: Get strategic initiatives
 *     description: Retrieve strategic initiatives with optional filtering and sorting
 *     tags: [Strategy]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [planning, active, completed, paused, cancelled]
 *         description: Filter by initiative status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Filter by initiative priority
 *       - in: query
 *         name: season_id
 *         schema:
 *           type: string
 *         description: Filter by season UUID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title, description, and anchor_goal
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Filter by tags (comma-separated)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Maximum number of initiatives to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *         description: Number of initiatives to skip
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [created_at, updated_at, title, priority, due_date, progress]
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
 *         description: List of strategic initiatives
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
    const queryResult = QueryInitiativeSchema.safeParse(Object.fromEntries(searchParams))
    if (!queryResult.success) {
      return jsonWithCors(request, {
        error: 'Invalid query parameters',
        details: queryResult.error.errors
      }, 400)
    }

    const query = queryResult.data
    const client = createClientForRequest(request) || supabase

    // Build Supabase query
    let dbQuery = client
      .from('core_strategy_initiatives')
      .select(`
        *,
        season:seasons(id, title, theme),
        category:categories(id, name, color, icon),
        task_count:core_strategy_tasks(count),
        completed_task_count:core_strategy_tasks!inner(count)
      `)
      .eq('user_id', userId)

    // Apply filters
    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status)
    }
    if (query.priority) {
      dbQuery = dbQuery.eq('priority', query.priority)
    }
    if (query.season_id) {
      dbQuery = dbQuery.eq('season_id', query.season_id)
    }
    if (query.search) {
      dbQuery = dbQuery.or(`title.ilike.%${query.search}%,description.ilike.%${query.search}%,anchor_goal.ilike.%${query.search}%`)
    }
    if (query.tags) {
      const filterTags = query.tags.split(',').map(tag => tag.trim())
      dbQuery = dbQuery.overlaps('tags', filterTags)
    }

    // Apply sorting
    const ascending = query.sort_order === 'asc'
    if (query.sort_by === 'title') {
      dbQuery = dbQuery.order('title', { ascending })
    } else if (query.sort_by === 'due_date') {
      dbQuery = dbQuery.order('due_date', { ascending, nullsFirst: false })
    } else if (query.sort_by === 'priority') {
      // Order by priority importance: critical > high > medium > low
      const priorityOrder = ascending ? 'low, medium, high, critical' : 'critical, high, medium, low'
      dbQuery = dbQuery.order('priority', { ascending })
    } else {
      dbQuery = dbQuery.order(query.sort_by, { ascending })
    }

    // Apply pagination
    dbQuery = dbQuery.range(query.offset, query.offset + query.limit - 1)

    const { data, error } = await dbQuery

    if (error) {
      console.error('Database error:', error)
      return jsonWithCors(request, { error: 'Failed to fetch initiatives' }, 500)
    }

    // Map and enhance data
    const initiatives: Initiative[] = (data || []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      season_id: row.season_id,
      title: row.title,
      description: row.description,
      anchor_goal: row.anchor_goal,
      success_metric: row.success_metric,
      status: row.status,
      priority: row.priority,
      progress: row.progress,
      progress_calculation: row.progress_calculation,
      start_date: row.start_date,
      due_date: row.due_date,
      completion_date: row.completion_date,
      tags: row.tags || [],
      category_id: row.category_id,
      metadata: row.metadata || {},
      created_at: row.created_at,
      updated_at: row.updated_at,
      season: row.season || null,
      category: row.category || null,
      task_count: row.task_count?.[0]?.count || 0,
      completed_task_count: row.completed_task_count?.filter((t: any) => t.status === 'completed')?.[0]?.count || 0
    }))

    return jsonWithCors(request, initiatives)
  } catch (error) {
    console.error('API error:', error)
    const errorMessage = sanitizeErrorMessage(error)
    return jsonWithCors(request, { error: errorMessage }, 500)
  }
}

// =====================================================
// POST /api/strategy/initiatives
// Create a new strategic initiative
// =====================================================
/**
 * @swagger
 * /api/strategy/initiatives:
 *   post:
 *     summary: Create a new strategic initiative
 *     description: Create a new strategic initiative for the authenticated user
 *     tags: [Strategy]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 description: Initiative title
 *               description:
 *                 type: string
 *                 description: Detailed description
 *               anchor_goal:
 *                 type: string
 *                 description: Main goal/outcome
 *               success_metric:
 *                 type: string
 *                 description: How success is measured
 *               status:
 *                 type: string
 *                 enum: [planning, active, completed, paused, cancelled]
 *                 default: planning
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 default: medium
 *               progress:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *                 default: 0
 *               progress_calculation:
 *                 type: string
 *                 enum: [manual, task_based, weighted_tasks]
 *                 default: manual
 *               start_date:
 *                 type: string
 *                 format: date
 *               due_date:
 *                 type: string
 *                 format: date
 *               season_id:
 *                 type: string
 *                 format: uuid
 *               category_id:
 *                 type: string
 *                 format: uuid
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               metadata:
 *                 type: object
 *           example:
 *             title: "Expand Market Presence"
 *             description: "Increase market share in key demographics"
 *             anchor_goal: "Achieve 25% market share growth"
 *             success_metric: "Monthly recurring revenue > $100k"
 *             priority: "high"
 *             due_date: "2024-12-31"
 *             tags: ["growth", "marketing", "strategy"]
 *     responses:
 *       201:
 *         description: Initiative created successfully
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
    const validationResult = CreateInitiativeSchema.safeParse(body)
    if (!validationResult.success) {
      return jsonWithCors(request, {
        error: 'Invalid initiative data',
        details: validationResult.error.errors
      }, 400)
    }

    const initiativeData = validationResult.data
    const client = createClientForRequest(request) || supabase

    // Prepare insert payload
    const insertPayload = {
      user_id: userId,
      title: initiativeData.title,
      description: initiativeData.description || null,
      anchor_goal: initiativeData.anchor_goal || null,
      success_metric: initiativeData.success_metric || null,
      status: initiativeData.status,
      priority: initiativeData.priority,
      progress: initiativeData.progress,
      progress_calculation: initiativeData.progress_calculation,
      start_date: initiativeData.start_date || null,
      due_date: initiativeData.due_date || null,
      completion_date: initiativeData.completion_date || null,
      season_id: initiativeData.season_id || null,
      category_id: initiativeData.category_id || null,
      tags: initiativeData.tags,
      metadata: initiativeData.metadata
    }

    // If creating with completed status and no explicit completion_date, set it to now
    if (insertPayload.status === 'completed' && !insertPayload.completion_date) {
      insertPayload.completion_date = new Date().toISOString()
    }

    const { data, error } = await client
      .from('core_strategy_initiatives')
      .insert(insertPayload)
      .select(`
        *,
        season:seasons(id, title, theme),
        category:categories(id, name, color, icon)
      `)
      .single()

    if (error) {
      console.error('Database error:', error)
      return jsonWithCors(request, { error: 'Failed to create initiative' }, 500)
    }

    const initiative: Initiative = {
      id: data.id,
      user_id: data.user_id,
      season_id: data.season_id,
      title: data.title,
      description: data.description,
      anchor_goal: data.anchor_goal,
      success_metric: data.success_metric,
      status: data.status,
      priority: data.priority,
      progress: data.progress,
      progress_calculation: data.progress_calculation,
      start_date: data.start_date,
      due_date: data.due_date,
      completion_date: data.completion_date,
      tags: data.tags || [],
      category_id: data.category_id,
      metadata: data.metadata || {},
      created_at: data.created_at,
      updated_at: data.updated_at,
      season: data.season || null,
      category: data.category || null,
      task_count: 0,
      completed_task_count: 0
    }

    return jsonWithCors(request, initiative, 201)
  } catch (error) {
    console.error('API error:', error)
    const errorMessage = sanitizeErrorMessage(error)
    return jsonWithCors(request, { error: errorMessage }, 500)
  }
}