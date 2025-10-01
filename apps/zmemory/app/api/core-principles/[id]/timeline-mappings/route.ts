import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getClientForAuthType, getUserIdFromRequest, addUserIdIfNeeded } from '@/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '@/lib/security';
import {
  CreateTimelineMappingSchema,
  TimelineMappingQuerySchema,
  TimelineMappingMemory,
  ApplicationType
} from '@/lib/core-principles-types';
import { nowUTC } from '@/lib/time-utils';

// Create Supabase client (service key only for mock fallback; real requests use bearer token)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Mock data for when Supabase is not configured
const generateMockMappings = (principleId: string): TimelineMappingMemory[] => [
  {
    id: '1',
    type: 'principle_timeline_mapping',
    content: {
      principle_id: principleId,
      timeline_item_id: 'timeline-1',
      application_type: ApplicationType.PRE_DECISION,
      reflection_notes: 'Applied this principle before making the hiring decision',
      effectiveness_rating: 4,
      decision_context: 'Hiring new team member',
      outcome_observed: 'Made a good hire with cultural fit',
      would_apply_again: true,
      applied_at: new Date(Date.now() - 86400000).toISOString()
    },
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    user_id: 'mock-user'
  },
  {
    id: '2',
    type: 'principle_timeline_mapping',
    content: {
      principle_id: principleId,
      timeline_item_id: 'timeline-2',
      application_type: ApplicationType.POST_REFLECTION,
      reflection_notes: 'Reflected on how this principle could have helped',
      effectiveness_rating: 3,
      lessons_learned: 'Should have been more transparent in the initial discussion',
      would_apply_again: true,
      applied_at: new Date(Date.now() - 172800000).toISOString()
    },
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 172800000).toISOString(),
    user_id: 'mock-user'
  }
];

/**
 * @swagger
 * /api/core-principles/{id}/timeline-mappings:
 *   get:
 *     summary: Get timeline mappings for a specific principle
 *     description: Retrieve all timeline item mappings for a given core principle
 *     tags: [Core Principles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The core principle ID
 *       - in: query
 *         name: timeline_item_id
 *         schema:
 *           type: string
 *         description: Filter by specific timeline item
 *       - in: query
 *         name: application_type
 *         schema:
 *           type: string
 *           enum: [pre_decision, post_reflection, learning, validation]
 *         description: Filter by application type
 *       - in: query
 *         name: effectiveness_rating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: Filter by effectiveness rating
 *       - in: query
 *         name: would_apply_again
 *         schema:
 *           type: boolean
 *         description: Filter by would apply again
 *       - in: query
 *         name: applied_before
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter mappings applied before this date
 *       - in: query
 *         name: applied_after
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter mappings applied after this date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of mappings to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of mappings to skip
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [applied_at, created_at, effectiveness_rating]
 *           default: applied_at
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
 *         description: List of timeline mappings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TimelineMappingMemory'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         description: Core principle not found
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 300)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const { id: principleId } = await params;
    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const queryResult = TimelineMappingQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryResult.error.errors },
        { status: 400 }
      );
    }

    const query = queryResult.data;

    // If Supabase is not configured, return filtered mock data
    if (!supabase) {
      let mappings = generateMockMappings(principleId);

      // Apply filters
      if (query.timeline_item_id) {
        mappings = mappings.filter(mapping => mapping.content.timeline_item_id === query.timeline_item_id);
      }
      if (query.application_type) {
        mappings = mappings.filter(mapping => mapping.content.application_type === query.application_type);
      }
      if (query.effectiveness_rating) {
        mappings = mappings.filter(mapping => mapping.content.effectiveness_rating === query.effectiveness_rating);
      }
      if (query.would_apply_again !== undefined) {
        mappings = mappings.filter(mapping => mapping.content.would_apply_again === query.would_apply_again);
      }

      // Apply pagination
      const start = query.offset;
      const end = start + query.limit;
      mappings = mappings.slice(start, end);

      return jsonWithCors(request, mappings);
    }

    // Enforce auth
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      if (process.env.NODE_ENV !== 'production') {
        // Return mock data in development
        let mappings = generateMockMappings(principleId);
        const start = query.offset;
        const end = start + query.limit;
        mappings = mappings.slice(start, end);
        return jsonWithCors(request, mappings);
      }
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = await getClientForAuthType(request) || supabase;

    // First verify the principle exists and user has access to it
    const { data: principleExists, error: principleError } = await client
      .from('core_principles')
      .select('id')
      .eq('id', principleId)
      .or(`user_id.eq.${userId},is_default.eq.true`)
      .single();

    if (principleError || !principleExists) {
      return jsonWithCors(request, { error: 'Core principle not found' }, 404);
    }

    // Build Supabase query against mapping table
    let dbQuery = client
      .from('core_principle_timeline_items_mapping')
      .select(`
        *,
        principle:core_principles(id, title, category),
        timeline_item:timeline_items(id, title, type)
      `)
      .eq('principle_id', principleId)
      .eq('user_id', userId);

    // Apply filters
    if (query.timeline_item_id) {
      dbQuery = dbQuery.eq('timeline_item_id', query.timeline_item_id);
    }
    if (query.application_type) {
      dbQuery = dbQuery.eq('application_type', query.application_type);
    }
    if (query.effectiveness_rating) {
      dbQuery = dbQuery.eq('effectiveness_rating', query.effectiveness_rating);
    }
    if (query.would_apply_again !== undefined) {
      dbQuery = dbQuery.eq('would_apply_again', query.would_apply_again);
    }
    if (query.applied_before) {
      dbQuery = dbQuery.lte('applied_at', query.applied_before);
    }
    if (query.applied_after) {
      dbQuery = dbQuery.gte('applied_at', query.applied_after);
    }

    // Apply sorting
    const ascending = query.sort_order === 'asc';
    if (query.sort_by === 'effectiveness_rating') {
      dbQuery = dbQuery.order('effectiveness_rating', { ascending, nullsFirst: false });
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
        let mappings = generateMockMappings(principleId);
        const start = query.offset;
        const end = start + query.limit;
        mappings = mappings.slice(start, end);
        return jsonWithCors(request, mappings);
      }
      return NextResponse.json(
        { error: 'Failed to fetch timeline mappings' },
        { status: 500 }
      );
    }

    // Map mapping rows to TimelineMappingMemory shape
    const mapped = (data || []).map((row: any) => ({
      id: row.id,
      type: 'principle_timeline_mapping' as const,
      content: {
        principle_id: row.principle_id,
        timeline_item_id: row.timeline_item_id,
        application_type: row.application_type,
        reflection_notes: row.reflection_notes || undefined,
        effectiveness_rating: row.effectiveness_rating || undefined,
        lessons_learned: row.lessons_learned || undefined,
        decision_context: row.decision_context || undefined,
        outcome_observed: row.outcome_observed || undefined,
        would_apply_again: row.would_apply_again || undefined,
        applied_at: row.applied_at
      },
      created_at: row.created_at,
      updated_at: row.updated_at,
      user_id: row.user_id,
      // Add populated relations
      principle: row.principle || undefined,
      timeline_item: row.timeline_item || undefined
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
 * /api/core-principles/{id}/timeline-mappings:
 *   post:
 *     summary: Create a new timeline mapping for a principle
 *     description: Create a new mapping between a core principle and a timeline item
 *     tags: [Core Principles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The core principle ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTimelineMappingRequest'
 *           example:
 *             type: "principle_timeline_mapping"
 *             content:
 *               timeline_item_id: "timeline-item-uuid"
 *               application_type: "pre_decision"
 *               reflection_notes: "Applied radical transparency before the team meeting"
 *               effectiveness_rating: 4
 *               decision_context: "Discussing project timeline concerns"
 *               outcome_observed: "Team appreciated the honesty and we found a better solution"
 *               would_apply_again: true
 *     responses:
 *       201:
 *         description: Timeline mapping created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TimelineMappingMemory'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         description: Core principle not found
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 50)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const { id: principleId } = await params;
    const body = await request.json();

    // Validate request body
    const validationResult = CreateTimelineMappingSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('CREATE TIMELINE MAPPING Validation failed:', validationResult.error.errors);
      return NextResponse.json(
        { error: 'Invalid timeline mapping data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const mappingData = validationResult.data;
    const now = nowUTC();

    // Ensure the principle_id in the body matches the URL parameter
    if (mappingData.content.principle_id !== principleId) {
      return NextResponse.json(
        { error: 'Principle ID in URL does not match principle ID in request body' },
        { status: 400 }
      );
    }

    // If Supabase is not configured, return mock response
    if (!supabase) {
      const mockMapping: TimelineMappingMemory = {
        id: Date.now().toString(),
        type: 'principle_timeline_mapping',
        content: mappingData.content,
        created_at: now,
        updated_at: now,
        user_id: 'mock-user'
      };
      return jsonWithCors(request, mockMapping, 201);
    }

    // Enforce auth
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = await getClientForAuthType(request) || supabase;

    // Verify the principle exists and user has access to it
    const { data: principleExists, error: principleError } = await client
      .from('core_principles')
      .select('id')
      .eq('id', principleId)
      .or(`user_id.eq.${userId},is_default.eq.true`)
      .single();

    if (principleError || !principleExists) {
      return jsonWithCors(request, { error: 'Core principle not found' }, 404);
    }

    const insertPayload: any = {
      principle_id: principleId,
      timeline_item_id: mappingData.content.timeline_item_id,
      application_type: mappingData.content.application_type,
      reflection_notes: mappingData.content.reflection_notes || null,
      effectiveness_rating: mappingData.content.effectiveness_rating || null,
      lessons_learned: mappingData.content.lessons_learned || null,
      decision_context: mappingData.content.decision_context || null,
      outcome_observed: mappingData.content.outcome_observed || null,
      would_apply_again: mappingData.content.would_apply_again || null,
      applied_at: mappingData.content.applied_at || now,
      created_at: now,
      updated_at: now
    };

    // Add user_id to payload (always needed since we use service role client)
    await addUserIdIfNeeded(insertPayload, userId, request);

    const { data, error } = await client
      .from('core_principle_timeline_items_mapping')
      .insert(insertPayload)
      .select(`
        *,
        principle:core_principles(id, title, category),
        timeline_item:timeline_items(id, title, type)
      `)
      .single();

    if (error) {
      console.error('Database error:', error);
      return jsonWithCors(request, { error: 'Failed to create timeline mapping' }, 500);
    }

    const mapped: TimelineMappingMemory = {
      id: data.id,
      type: 'principle_timeline_mapping',
      content: {
        principle_id: data.principle_id,
        timeline_item_id: data.timeline_item_id,
        application_type: data.application_type,
        reflection_notes: data.reflection_notes || undefined,
        effectiveness_rating: data.effectiveness_rating || undefined,
        lessons_learned: data.lessons_learned || undefined,
        decision_context: data.decision_context || undefined,
        outcome_observed: data.outcome_observed || undefined,
        would_apply_again: data.would_apply_again || undefined,
        applied_at: data.applied_at
      },
      created_at: data.created_at,
      updated_at: data.updated_at,
      user_id: data.user_id,
      // Add populated relations
      principle: data.principle || undefined,
      timeline_item: data.timeline_item || undefined
    };

    console.log('Returning created timeline mapping:', JSON.stringify(mapped, null, 2));
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