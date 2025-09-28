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

const MemoryTypeSchema = z.enum(['insight', 'reflection', 'lesson_learned', 'milestone', 'retrospective', 'planning_note'])
const ImportanceLevelSchema = z.enum(['low', 'medium', 'high', 'critical'])

const CreateStrategyMemorySchema = z.object({
  initiative_id: z.string().uuid().optional(),
  season_id: z.string().uuid().optional(),
  memory_id: z.string().uuid().optional(), // Link to existing memory
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  memory_type: MemoryTypeSchema,
  importance_level: ImportanceLevelSchema.default('medium'),
  is_highlight: z.boolean().default(false),
  is_shareable: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  context_data: z.record(z.any()).default({}) // Additional context like metrics, decisions made, etc.
})

const QueryStrategyMemorySchema = z.object({
  initiative_id: z.string().uuid().optional(),
  season_id: z.string().uuid().optional(),
  memory_type: MemoryTypeSchema.optional(),
  importance_level: ImportanceLevelSchema.optional(),
  is_highlight: z.coerce.boolean().optional(),
  is_shareable: z.coerce.boolean().optional(),
  search: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sort_by: z.enum(['created_at', 'updated_at', 'title', 'importance_level', 'memory_type']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
})

type StrategyMemory = {
  id: string
  user_id: string
  initiative_id: string | null
  season_id: string | null
  memory_id: string | null
  title: string
  content: string
  memory_type: z.infer<typeof MemoryTypeSchema>
  importance_level: z.infer<typeof ImportanceLevelSchema>
  is_highlight: boolean
  is_shareable: boolean
  tags: string[]
  context_data: Record<string, any>
  created_at: string
  updated_at: string
  // Joined data
  initiative?: { id: string; title: string; status: string } | null
  season?: { id: string; title: string; theme: string } | null
  regular_memory?: { id: string; title: string; type: string } | null
}

// =====================================================
// OPTIONS handler for CORS
// =====================================================
export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request)
}

// =====================================================
// GET /api/strategy/memories
// Get all strategic memories for the authenticated user
// =====================================================
/**
 * @swagger
 * /api/strategy/memories:
 *   get:
 *     summary: Get strategic memories
 *     description: Retrieve strategic memories with optional filtering and sorting
 *     tags: [Strategy]
 *     parameters:
 *       - in: query
 *         name: initiative_id
 *         schema:
 *           type: string
 *         description: Filter by initiative UUID
 *       - in: query
 *         name: season_id
 *         schema:
 *           type: string
 *         description: Filter by season UUID
 *       - in: query
 *         name: memory_type
 *         schema:
 *           type: string
 *           enum: [insight, reflection, lesson_learned, milestone, retrospective, planning_note]
 *         description: Filter by memory type
 *       - in: query
 *         name: importance_level
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Filter by importance level
 *       - in: query
 *         name: is_highlight
 *         schema:
 *           type: boolean
 *         description: Filter by highlight status
 *       - in: query
 *         name: is_shareable
 *         schema:
 *           type: boolean
 *         description: Filter by shareable status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and content
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
 *         description: Maximum number of memories to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *         description: Number of memories to skip
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [created_at, updated_at, title, importance_level, memory_type]
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
 *         description: List of strategic memories
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
    const queryResult = QueryStrategyMemorySchema.safeParse(Object.fromEntries(searchParams))
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
      .from('core_strategy_memories')
      .select(`
        *,
        initiative:core_strategy_initiatives(id, title, status),
        season:seasons(id, title, theme),
        regular_memory:memories(id, title, type)
      `)
      .eq('user_id', userId)

    // Apply filters
    if (query.initiative_id) {
      dbQuery = dbQuery.eq('initiative_id', query.initiative_id)
    }
    if (query.season_id) {
      dbQuery = dbQuery.eq('season_id', query.season_id)
    }
    if (query.memory_type) {
      dbQuery = dbQuery.eq('memory_type', query.memory_type)
    }
    if (query.importance_level) {
      dbQuery = dbQuery.eq('importance_level', query.importance_level)
    }
    if (query.is_highlight !== undefined) {
      dbQuery = dbQuery.eq('is_highlight', query.is_highlight)
    }
    if (query.is_shareable !== undefined) {
      dbQuery = dbQuery.eq('is_shareable', query.is_shareable)
    }
    if (query.search) {
      dbQuery = dbQuery.or(`title.ilike.%${query.search}%,content.ilike.%${query.search}%`)
    }
    if (query.tags) {
      const filterTags = query.tags.split(',').map(tag => tag.trim())
      dbQuery = dbQuery.overlaps('tags', filterTags)
    }

    // Apply sorting
    const ascending = query.sort_order === 'asc'
    if (query.sort_by === 'title') {
      dbQuery = dbQuery.order('title', { ascending })
    } else if (query.sort_by === 'importance_level') {
      // Order by importance: critical > high > medium > low
      dbQuery = dbQuery.order('importance_level', { ascending })
    } else if (query.sort_by === 'memory_type') {
      dbQuery = dbQuery.order('memory_type', { ascending })
    } else {
      dbQuery = dbQuery.order(query.sort_by, { ascending })
    }

    // Apply pagination
    dbQuery = dbQuery.range(query.offset, query.offset + query.limit - 1)

    const { data, error } = await dbQuery

    if (error) {
      console.error('Database error:', error)
      return jsonWithCors(request, { error: 'Failed to fetch strategic memories' }, 500)
    }

    // Map data
    const memories: StrategyMemory[] = (data || []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      initiative_id: row.initiative_id,
      season_id: row.season_id,
      memory_id: row.memory_id,
      title: row.title,
      content: row.content,
      memory_type: row.memory_type,
      importance_level: row.importance_level,
      is_highlight: row.is_highlight,
      is_shareable: row.is_shareable,
      tags: row.tags || [],
      context_data: row.context_data || {},
      created_at: row.created_at,
      updated_at: row.updated_at,
      initiative: row.initiative || null,
      season: row.season || null,
      regular_memory: row.regular_memory || null
    }))

    return jsonWithCors(request, memories)
  } catch (error) {
    console.error('API error:', error)
    const errorMessage = sanitizeErrorMessage(error)
    return jsonWithCors(request, { error: errorMessage }, 500)
  }
}

// =====================================================
// POST /api/strategy/memories
// Create a new strategic memory
// =====================================================
/**
 * @swagger
 * /api/strategy/memories:
 *   post:
 *     summary: Create a new strategic memory
 *     description: Create a new strategic memory for the authenticated user
 *     tags: [Strategy]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - memory_type
 *             properties:
 *               initiative_id:
 *                 type: string
 *                 format: uuid
 *                 description: Related initiative UUID (optional)
 *               season_id:
 *                 type: string
 *                 format: uuid
 *                 description: Related season UUID (optional)
 *               memory_id:
 *                 type: string
 *                 format: uuid
 *                 description: Linked regular memory UUID (optional)
 *               title:
 *                 type: string
 *                 description: Memory title
 *               content:
 *                 type: string
 *                 description: Memory content
 *               memory_type:
 *                 type: string
 *                 enum: [insight, reflection, lesson_learned, milestone, retrospective, planning_note]
 *                 description: Type of strategic memory
 *               importance_level:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 default: medium
 *                 description: Importance level
 *               is_highlight:
 *                 type: boolean
 *                 default: false
 *                 description: Whether this is a highlight
 *               is_shareable:
 *                 type: boolean
 *                 default: false
 *                 description: Whether this can be shared
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Tags for categorization
 *               context_data:
 *                 type: object
 *                 description: Additional context data
 *           example:
 *             title: "Key Market Insight"
 *             content: "Discovered that our target audience prefers mobile-first experiences"
 *             memory_type: "insight"
 *             importance_level: "high"
 *             is_highlight: true
 *             tags: ["market-research", "mobile", "user-experience"]
 *             context_data:
 *               source: "Customer interviews"
 *               confidence: "high"
 *               date_discovered: "2024-01-15"
 *     responses:
 *       201:
 *         description: Strategic memory created successfully
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
    const validationResult = CreateStrategyMemorySchema.safeParse(body)
    if (!validationResult.success) {
      return jsonWithCors(request, {
        error: 'Invalid strategic memory data',
        details: validationResult.error.errors
      }, 400)
    }

    const memoryData = validationResult.data
    const client = createClientForRequest(request) || supabase

    // Verify that referenced entities exist and belong to the user
    if (memoryData.initiative_id) {
      const { data: initiative, error: initiativeError } = await client
        .from('core_strategy_initiatives')
        .select('id')
        .eq('id', memoryData.initiative_id)
        .eq('user_id', userId)
        .single()

      if (initiativeError || !initiative) {
        return jsonWithCors(request, { error: 'Initiative not found or access denied' }, 404)
      }
    }

    if (memoryData.season_id) {
      const { data: season, error: seasonError } = await client
        .from('seasons')
        .select('id')
        .eq('id', memoryData.season_id)
        .eq('user_id', userId)
        .single()

      if (seasonError || !season) {
        return jsonWithCors(request, { error: 'Season not found or access denied' }, 404)
      }
    }

    // Prepare insert payload
    const insertPayload = {
      user_id: userId,
      initiative_id: memoryData.initiative_id || null,
      season_id: memoryData.season_id || null,
      memory_id: memoryData.memory_id || null,
      title: memoryData.title,
      content: memoryData.content,
      memory_type: memoryData.memory_type,
      importance_level: memoryData.importance_level,
      is_highlight: memoryData.is_highlight,
      is_shareable: memoryData.is_shareable,
      tags: memoryData.tags,
      context_data: memoryData.context_data
    }

    const { data, error } = await client
      .from('core_strategy_memories')
      .insert(insertPayload)
      .select(`
        *,
        initiative:core_strategy_initiatives(id, title, status),
        season:seasons(id, title, theme),
        regular_memory:memories(id, title, type)
      `)
      .single()

    if (error) {
      console.error('Database error:', error)
      return jsonWithCors(request, { error: 'Failed to create strategic memory' }, 500)
    }

    const strategyMemory: StrategyMemory = {
      id: data.id,
      user_id: data.user_id,
      initiative_id: data.initiative_id,
      season_id: data.season_id,
      memory_id: data.memory_id,
      title: data.title,
      content: data.content,
      memory_type: data.memory_type,
      importance_level: data.importance_level,
      is_highlight: data.is_highlight,
      is_shareable: data.is_shareable,
      tags: data.tags || [],
      context_data: data.context_data || {},
      created_at: data.created_at,
      updated_at: data.updated_at,
      initiative: data.initiative || null,
      season: data.season || null,
      regular_memory: data.regular_memory || null
    }

    return jsonWithCors(request, strategyMemory, 201)
  } catch (error) {
    console.error('API error:', error)
    const errorMessage = sanitizeErrorMessage(error)
    return jsonWithCors(request, { error: errorMessage }, 500)
  }
}