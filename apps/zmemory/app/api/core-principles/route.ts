import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getClientForAuthType, getUserIdFromRequest } from '@/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '@/lib/security';
import {
  CreateCorePrincipleSchema,
  CorePrincipleQuerySchema,
  CorePrincipleMemory,
  CorePrincipleStatus,
  CorePrincipleCategory,
  CorePrincipleSource
} from '@/lib/core-principles-types';
import { nowUTC } from '@/lib/time-utils';

// Create Supabase client (service key only for mock fallback; real requests use bearer token)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Mock data for when Supabase is not configured
const generateMockPrinciples = (): CorePrincipleMemory[] => [
  {
    id: '1',
    type: 'core_principle',
    content: {
      title: 'Be radically transparent',
      description: 'Share your thoughts and encourage others to do the same. This creates an environment where the best ideas can emerge.',
      category: CorePrincipleCategory.WORK_PRINCIPLES,
      status: CorePrincipleStatus.ACTIVE,
      is_default: true,
      source: CorePrincipleSource.RAY_DALIO,
      trigger_questions: ['What am I not saying that could be helpful?', 'Am I being completely honest about this situation?'],
      application_examples: ['Share concerns openly in meetings', 'Give direct feedback without sugar-coating'],
      importance_level: 5,
      application_count: 15
    },
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    user_id: 'mock-user'
  },
  {
    id: '2',
    type: 'core_principle',
    content: {
      title: 'Embrace reality and deal with it',
      description: 'See things as they are, not as you wish they were. Accept the truth and work with it rather than against it.',
      category: CorePrincipleCategory.LIFE_PRINCIPLES,
      status: CorePrincipleStatus.ACTIVE,
      is_default: true,
      source: CorePrincipleSource.RAY_DALIO,
      trigger_questions: ['What is really happening here?', 'Am I seeing this situation clearly?'],
      application_examples: ['Face difficult conversations directly', 'Acknowledge failed strategies'],
      importance_level: 5,
      application_count: 8
    },
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 43200000).toISOString(),
    user_id: 'mock-user'
  }
];

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
export async function GET(request: NextRequest) {
  try {
    // Rate limiting - more permissive for GET requests
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 300)) { // 300 requests per 15 minutes
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

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

    // If Supabase is not configured, return filtered mock data
    if (!supabase) {
      let principles = generateMockPrinciples();

      // Apply filters
      if (query.category) {
        principles = principles.filter(principle => principle.content.category === query.category);
      }
      if (query.status) {
        principles = principles.filter(principle => principle.content.status === query.status);
      }
      if (query.source) {
        principles = principles.filter(principle => principle.content.source === query.source);
      }
      if (query.is_default !== undefined) {
        principles = principles.filter(principle => principle.content.is_default === query.is_default);
      }
      if (query.importance_level) {
        principles = principles.filter(principle => principle.content.importance_level === query.importance_level);
      }
      if (query.search) {
        const searchLower = query.search.toLowerCase();
        principles = principles.filter(principle =>
          principle.content.title.toLowerCase().includes(searchLower) ||
          (principle.content.description && principle.content.description.toLowerCase().includes(searchLower))
        );
      }

      // Apply pagination
      const start = query.offset;
      const end = start + query.limit;
      principles = principles.slice(start, end);

      return jsonWithCors(request, principles);
    }

    // Enforce auth (dev fallback to mock when not authenticated)
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      if (process.env.NODE_ENV !== 'production') {
        // In development, allow UI to work without auth
        let principles = generateMockPrinciples();
        // Apply minimal filtering for better UX
        if (query.category) principles = principles.filter(p => p.content.category === query.category);
        if (query.status) principles = principles.filter(p => p.content.status === query.status);
        if (query.source) principles = principles.filter(p => p.content.source === query.source);
        const start = query.offset;
        const end = start + query.limit;
        principles = principles.slice(start, end);
        return jsonWithCors(request, principles);
      }
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = await getClientForAuthType(request) || supabase;

    // Build Supabase query against core_principles table
    let dbQuery = client
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
      if (process.env.NODE_ENV !== 'production') {
        // Dev fallback: return mock instead of breaking the UI
        let principles = generateMockPrinciples();
        const start = query.offset;
        const end = start + query.limit;
        principles = principles.slice(start, end);
        return jsonWithCors(request, principles);
      }
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

    return jsonWithCors(request, mapped);
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
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
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 50)) { // Stricter limit for POST
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

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

    // If Supabase is not configured, return mock response
    if (!supabase) {
      const mockPrinciple: CorePrincipleMemory = {
        id: Date.now().toString(),
        type: 'core_principle',
        content: principleData.content,
        metadata: principleData.metadata,
        created_at: now,
        updated_at: now,
        user_id: 'mock-user'
      };
      return jsonWithCors(request, mockPrinciple, 201);
    }

    // Enforce auth
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = await getClientForAuthType(request) || supabase;

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
      created_at: now,
      updated_at: now,
      user_id: userId
    };

    const { data, error } = await client
      .from('core_principles')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      console.error('Database error:', error);
      return jsonWithCors(request, { error: 'Failed to create core principle' }, 500);
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

    console.log('Returning created core principle:', JSON.stringify(mapped, null, 2));
    return jsonWithCors(request, mapped, 201);
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}