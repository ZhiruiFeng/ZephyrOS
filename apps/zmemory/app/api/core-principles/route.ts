import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabaseServer } from '@/lib/config/supabase-server';
import {
  CreateCorePrincipleSchema,
  CorePrincipleQuerySchema,
  CorePrincipleMemory
} from '@/lib/types/core-principles-types';
import { nowUTC } from '@/lib/utils/time-utils';

/**
 * @swagger
 * /api/core-principles:
 *   get:
 *     summary: Get core principles with optional filtering
 *     description: Retrieve core principles with support for filtering by category, status, source, and more
 *     tags: [Core Principles]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [work_principles, life_principles, decision_making, relationships, learning, leadership, custom]
 *         description: Filter by principle category
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, deprecated, archived]
 *         description: Filter by principle status
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [ray_dalio, user_custom]
 *         description: Filter by principle source
 *       - in: query
 *         name: is_default
 *         schema:
 *           type: boolean
 *         description: Filter by default principles
 *       - in: query
 *         name: importance_level
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: Filter by importance level
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of principles to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of principles to skip
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [created_at, updated_at, title, importance_level, application_count, last_applied_at]
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
 *         description: List of core principles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CorePrincipleMemory'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function handleGet(request: EnhancedRequest): Promise<NextResponse> {
  const userId = request.userId!;
  const { searchParams } = new URL(request.url);

  // Parse and validate query parameters
  const queryResult = CorePrincipleQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!queryResult.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: queryResult.error.errors },
      { status: 400 }
    );
  }

  const query = queryResult.data;

  // Build Supabase query against core_principles table
  let dbQuery = supabaseServer!
    .from('core_principles')
    .select('*')
    .or(`user_id.eq.${userId},is_default.eq.true`); // User's principles + defaults

  // Apply filters
  if (query.category) {
    dbQuery = dbQuery.eq('category', query.category);
  }
  if (query.status) {
    dbQuery = dbQuery.eq('status', query.status);
  }
  if (query.source) {
    dbQuery = dbQuery.eq('source', query.source);
  }
  if (query.is_default !== undefined) {
    dbQuery = dbQuery.eq('is_default', query.is_default);
  }
  if (query.importance_level) {
    dbQuery = dbQuery.eq('importance_level', query.importance_level);
  }
  if (query.search) {
    dbQuery = dbQuery.or(`title.ilike.%${query.search}%,description.ilike.%${query.search}%`);
  }

  // Apply sorting
  const ascending = query.sort_order === 'asc';
  if (query.sort_by === 'title') {
    dbQuery = dbQuery.order('title', { ascending });
  } else if (query.sort_by === 'importance_level') {
    dbQuery = dbQuery.order('importance_level', { ascending });
  } else if (query.sort_by === 'application_count') {
    dbQuery = dbQuery.order('application_count', { ascending });
  } else if (query.sort_by === 'last_applied_at') {
    dbQuery = dbQuery.order('last_applied_at', { ascending, nullsFirst: false });
  } else {
    dbQuery = dbQuery.order(query.sort_by, { ascending });
  }

  // Apply pagination
  dbQuery = dbQuery.range(query.offset, query.offset + query.limit - 1);

  const { data, error } = await dbQuery;

  if (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch core principles' },
      { status: 500 }
    );
  }

  // Map core_principles rows to CorePrincipleMemory shape
  const mapped = (data || []).map((row: any) => ({
    id: row.id,
    type: 'core_principle' as const,
    content: {
      title: row.title,
      description: row.description || undefined,
      category: row.category,
      status: row.status,
      is_default: row.is_default,
      source: row.source,
      trigger_questions: row.trigger_questions || [],
      application_examples: row.application_examples || [],
      personal_notes: row.personal_notes || undefined,
      importance_level: row.importance_level,
      application_count: row.application_count,
      last_applied_at: row.last_applied_at || undefined,
      deprecated_at: row.deprecated_at || undefined,
      deprecation_reason: row.deprecation_reason || undefined
    },
    metadata: row.metadata || {},
    created_at: row.created_at,
    updated_at: row.updated_at,
    user_id: row.user_id
  }));

  return NextResponse.json(mapped);
}

/**
 * @swagger
 * /api/core-principles:
 *   post:
 *     summary: Create a new core principle
 *     description: Create a new core principle memory with comprehensive principle data
 *     tags: [Core Principles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCorePrincipleRequest'
 *           example:
 *             type: "core_principle"
 *             content:
 *               title: "Always question assumptions"
 *               description: "Before making any decision, explicitly list and challenge your underlying assumptions"
 *               category: "decision_making"
 *               trigger_questions: ["What am I assuming here?", "What if this assumption is wrong?"]
 *               application_examples: ["List assumptions before team meetings", "Challenge budget assumptions quarterly"]
 *               importance_level: 4
 *     responses:
 *       201:
 *         description: Core principle created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CorePrincipleMemory'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function handlePost(request: EnhancedRequest): Promise<NextResponse> {
  const userId = request.userId!;
  const body = await request.json();

  // Validate request body
  const validationResult = CreateCorePrincipleSchema.safeParse(body);
  if (!validationResult.success) {
    console.error('CREATE CORE PRINCIPLE Validation failed:', validationResult.error.errors);
    return NextResponse.json(
      { error: 'Invalid core principle data', details: validationResult.error.errors },
      { status: 400 }
    );
  }

  const principleData = validationResult.data;
  const now = nowUTC();

  const insertPayload: any = {
    title: principleData.content.title,
    description: principleData.content.description || null,
    category: principleData.content.category,
    status: principleData.content.status || 'active',
    is_default: principleData.content.is_default || false,
    source: principleData.content.source || 'user_custom',
    trigger_questions: principleData.content.trigger_questions || [],
    application_examples: principleData.content.application_examples || [],
    personal_notes: principleData.content.personal_notes || null,
    importance_level: principleData.content.importance_level || 1,
    application_count: principleData.content.application_count || 0,
    last_applied_at: principleData.content.last_applied_at || null,
    deprecated_at: principleData.content.deprecated_at || null,
    deprecation_reason: principleData.content.deprecation_reason || null,
    metadata: principleData.metadata || {},
    user_id: userId,
    created_at: now,
    updated_at: now
  };

  const { data, error } = await supabaseServer!
    .from('core_principles')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to create core principle' }, { status: 500 });
  }

  const mapped: CorePrincipleMemory = {
    id: data.id,
    type: 'core_principle',
    content: {
      title: data.title,
      description: data.description || undefined,
      category: data.category,
      status: data.status,
      is_default: data.is_default,
      source: data.source,
      trigger_questions: data.trigger_questions || [],
      application_examples: data.application_examples || [],
      personal_notes: data.personal_notes || undefined,
      importance_level: data.importance_level,
      application_count: data.application_count,
      last_applied_at: data.last_applied_at || undefined,
      deprecated_at: data.deprecated_at || undefined,
      deprecation_reason: data.deprecation_reason || undefined
    },
    metadata: data.metadata || {},
    created_at: data.created_at,
    updated_at: data.updated_at,
    user_id: data.user_id
  };

  return NextResponse.json(mapped, { status: 201 });
}

export const GET = withStandardMiddleware(handleGet, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 300 }
});

export const POST = withStandardMiddleware(handlePost, {
  validation: { bodySchema: CreateCorePrincipleSchema },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 50 }
});

export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
