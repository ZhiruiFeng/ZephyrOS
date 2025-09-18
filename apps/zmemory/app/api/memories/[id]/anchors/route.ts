import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClientForRequest, getUserIdFromRequest } from '../../../../../lib/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '../../../../../lib/security';
import { 
  MemoryAnchorCreateSchema,
  MemoryAnchorsQuerySchema,
  type MemoryAnchorCreateBody,
  type MemoryAnchorsQuery
} from '../../../../../lib/validators';
import { nowUTC } from '../../../../../lib/time-utils';

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Mock data for development/testing
const generateMockAnchors = (memoryId: string) => [
  {
    memory_id: memoryId,
    anchor_item_id: 'task-123',
    relation_type: 'insight_from',
    local_time_range: null,
    weight: 3.5,
    notes: 'Learned this while working on the project',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    // Populated timeline item data
    timeline_item: {
      id: 'task-123',
      type: 'task',
      title: 'Implement user authentication',
      description: 'Add JWT authentication to the API',
      status: 'completed'
    }
  },
  {
    memory_id: memoryId,
    anchor_item_id: 'activity-456',
    relation_type: 'co_occurred',
    local_time_range: {
      start: new Date(Date.now() - 7200000).toISOString(),
      end: new Date(Date.now() - 5400000).toISOString()
    },
    weight: 2.0,
    notes: 'Happened during morning walk',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    timeline_item: {
      id: 'activity-456',
      type: 'activity',
      title: 'Morning walk',
      description: 'Peaceful walk in the park',
      status: 'completed'
    }
  }
];

/**
 * @swagger
 * /api/memories/{id}/anchors:
 *   get:
 *     summary: Get memory anchors
 *     description: Retrieve all anchor relationships for a specific memory
 *     tags: [Memory Anchors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Memory ID
 *       - in: query
 *         name: relation_type
 *         schema:
 *           type: string
 *           enum: [context_of, result_of, insight_from, about, co_occurred, triggered_by, reflects_on]
 *         description: Filter by relation type
 *       - in: query
 *         name: anchor_item_type
 *         schema:
 *           type: string
 *           enum: [task, activity, routine, habit]
 *         description: Filter by the type of anchored timeline item
 *       - in: query
 *         name: min_weight
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 10
 *         description: Minimum relationship weight
 *     responses:
 *       200:
 *         description: List of memory anchors with populated timeline item data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: memoryId } = await params;
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const { searchParams } = new URL(request.url);
    
    // Parse and validate query parameters
    const queryResult = MemoryAnchorsQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryResult.error.errors },
        { status: 400 }
      );
    }

    const query = queryResult.data;

    // If Supabase is not configured, return filtered mock data
    if (!supabase) {
      let anchors = generateMockAnchors(memoryId);
      
      // Apply filters to mock data
      if (query.relation_type) {
        anchors = anchors.filter(a => a.relation_type === query.relation_type);
      }
      if (query.anchor_item_type) {
        anchors = anchors.filter(a => a.timeline_item.type === query.anchor_item_type);
      }
      if (query.min_weight !== undefined) {
        anchors = anchors.filter(a => a.weight >= query.min_weight!);
      }
      
      return jsonWithCors(request, anchors.slice(query.offset, query.offset + query.limit));
    }

    // Enforce authentication
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      if (process.env.NODE_ENV !== 'production') {
        return jsonWithCors(request, generateMockAnchors(memoryId).slice(query.offset, query.offset + query.limit));
      }
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = createClientForRequest(request) || supabase;

    // First verify the memory belongs to the user
    const { data: memoryCheck, error: memoryError } = await client
      .from('memories')
      .select('id')
      .eq('id', memoryId)
      .eq('user_id', userId)
      .single();

    if (memoryError || !memoryCheck) {
      return jsonWithCors(request, { error: 'Memory not found' }, 404);
    }

    // Build query with timeline item data
    let dbQuery = client
      .from('memory_anchors')
      .select(`
        *,
        timeline_item:timeline_items!anchor_item_id (
          id,
          type,
          title,
          description,
          status,
          priority,
          category_id,
          tags,
          created_at,
          updated_at
        )
      `)
      .eq('memory_id', memoryId);

    // Apply filters
    if (query.relation_type) {
      dbQuery = dbQuery.eq('relation_type', query.relation_type);
    }
    if (query.min_weight !== undefined) {
      dbQuery = dbQuery.gte('weight', query.min_weight!);
    }
    if (query.anchor_item_type) {
      // Filter by timeline item type (this requires the join)
      dbQuery = dbQuery.eq('timeline_item.type', query.anchor_item_type);
    }

    // Apply pagination
    dbQuery = dbQuery
      .order('created_at', { ascending: false })
      .range(query.offset, query.offset + query.limit - 1);

    const { data, error } = await dbQuery;
    
    if (error) {
      console.error('Database error:', error);
      if (process.env.NODE_ENV !== 'production') {
        return jsonWithCors(request, generateMockAnchors(memoryId).slice(query.offset, query.offset + query.limit));
      }
      return NextResponse.json(
        { error: 'Failed to fetch memory anchors' },
        { status: 500 }
      );
    }

    // Transform local_time_range from database format
    const transformedData = (data || []).map(anchor => {
      if (anchor.local_time_range) {
        try {
          const rangeMatch = anchor.local_time_range.match(/^\[(.+),(.+)\)$/);
          if (rangeMatch) {
            const [, start, end] = rangeMatch;
            anchor.local_time_range = {
              start,
              end: end !== start ? end : undefined
            };
          }
        } catch (e) {
          console.warn('Failed to parse local_time_range:', anchor.local_time_range);
          anchor.local_time_range = null;
        }
      }
      return anchor;
    });

    return jsonWithCors(request, transformedData);
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

/**
 * @swagger
 * /api/memories/{id}/anchors:
 *   post:
 *     summary: Create a memory anchor
 *     description: Create a new anchor relationship between a memory and a timeline item
 *     tags: [Memory Anchors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Memory ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               anchor_item_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the timeline item to anchor to
 *               relation_type:
 *                 type: string
 *                 enum: [context_of, result_of, insight_from, about, co_occurred, triggered_by, reflects_on]
 *                 description: Type of relationship
 *               local_time_range:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: string
 *                     format: date-time
 *                   end:
 *                     type: string
 *                     format: date-time
 *                 description: Time slice within the anchored item
 *               weight:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 10
 *                 default: 1.0
 *                 description: Importance/strength of the relationship
 *               notes:
 *                 type: string
 *                 description: Additional context about the relationship
 *             required: [anchor_item_id, relation_type]
 *     responses:
 *       201:
 *         description: Memory anchor created successfully
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: memoryId } = await params;
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 50)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const body = await request.json();
    
    // Validate request body
    const validationResult = MemoryAnchorCreateSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('CREATE ANCHOR Validation failed:', validationResult.error.errors);
      return NextResponse.json(
        { error: 'Invalid anchor data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const anchorData = validationResult.data;
    const now = nowUTC();

    // Transform local_time_range for database storage
    let transformedData = { ...anchorData };
    if (anchorData.local_time_range) {
      const start = anchorData.local_time_range.start;
      const end = anchorData.local_time_range.end;
      transformedData.local_time_range = `[${start},${end || start})` as any;
    }

    // If Supabase is not configured, return mock response
    if (!supabase) {
      const mockAnchor = {
        memory_id: memoryId,
        ...transformedData,
        created_at: now
      };
      return jsonWithCors(request, mockAnchor, 201);
    }

    // Check if memoryId looks like mock data (simple numeric string)
    if (/^\d+$/.test(memoryId)) {
      const mockAnchor = {
        memory_id: memoryId,
        ...transformedData,
        created_at: now
      };
      return jsonWithCors(request, mockAnchor, 201);
    }

    // Enforce authentication (mock response already returned when Supabase is absent)
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    // Use service role client once the user has been verified so RLS does not
    // interfere with ownership checks while still enforcing them manually.
    const client = supabase;

    // Verify memory belongs to user
    // First, let's see how many rows match this memory ID
    const { data: allMemories, error: countError } = await client
      .from('memories')
      .select('id, user_id, title')
      .eq('id', memoryId);

    if (countError) {
      console.error('Memory count lookup error:', countError);
      return jsonWithCors(request, { error: `Memory count lookup failed: ${countError.message}` }, 500);
    }

    if (!allMemories || allMemories.length === 0) {
      console.error('Memory not found in database:', memoryId);
      return jsonWithCors(request, { error: 'Memory not found in database' }, 404);
    }

    if (allMemories.length > 1) {
      console.error('Multiple memories found with same ID:', { memoryId, count: allMemories.length, memories: allMemories });
      return jsonWithCors(request, { error: `Multiple memories found with ID ${memoryId}` }, 500);
    }

    const memoryCheck = allMemories[0];

    if (memoryCheck.user_id !== userId) {
      console.error('Memory belongs to different user:', { memoryUserId: memoryCheck.user_id, requestUserId: userId });
      return jsonWithCors(request, { error: 'Memory belongs to different user' }, 403);
    }

    // Verify anchor target exists and belongs to user
    const { data: anchorCheck, error: anchorError } = await client
      .from('timeline_items')
      .select('id, type, user_id')
      .eq('id', anchorData.anchor_item_id)
      .single();

    if (anchorError) {
      console.error('Timeline item lookup error:', anchorError);
      return jsonWithCors(request, { error: `Timeline item lookup failed: ${anchorError.message}` }, 500);
    }

    if (!anchorCheck) {
      return jsonWithCors(request, { error: 'Target timeline item not found' }, 404);
    }

    if (anchorCheck.user_id !== userId) {
      console.error('Timeline item belongs to different user:', { timelineItemUserId: anchorCheck.user_id, requestUserId: userId });
      return jsonWithCors(request, { error: 'Target timeline item belongs to different user' }, 403);
    }

    // Check if anchor already exists (prevent duplicates)
    const { data: existingAnchor } = await client
      .from('memory_anchors')
      .select('memory_id')
      .eq('memory_id', memoryId)
      .eq('anchor_item_id', anchorData.anchor_item_id)
      .eq('relation_type', anchorData.relation_type)
      .single();

    if (existingAnchor) {
      return jsonWithCors(request, { error: 'Anchor relationship already exists' }, 409);
    }

    // Create anchor
    const insertPayload = {
      memory_id: memoryId,
      ...transformedData,
      created_at: now
    };

    const { data, error } = await client
      .from('memory_anchors')
      .insert(insertPayload)
      .select(`
        *,
        timeline_item:timeline_items!anchor_item_id (
          id,
          type,
          title,
          description,
          status,
          priority,
          category_id,
          tags
        )
      `)
      .single();

    if (error) {
      console.error('Database insert error:', error);

      // If JWT expired or database connection issues in development, return mock anchor
      if (process.env.NODE_ENV !== 'production' &&
          (error.message.includes('JWT expired') ||
           error.message.includes('expired') ||
           error.message.includes('connection'))) {
        const mockAnchor = {
          memory_id: memoryId,
          ...transformedData,
          created_at: now
        };
        return jsonWithCors(request, mockAnchor, 201);
      }

      return jsonWithCors(request, { error: `Failed to create anchor: ${error.message}` }, 500);
    }

    // Transform local_time_range back for response
    if (data.local_time_range) {
      try {
        const rangeMatch = data.local_time_range.match(/^\[(.+),(.+)\)$/);
        if (rangeMatch) {
          const [, start, end] = rangeMatch;
          data.local_time_range = {
            start,
            end: end !== start ? end : undefined
          };
        }
      } catch (e) {
        console.warn('Failed to parse local_time_range:', data.local_time_range);
        data.local_time_range = null;
      }
    }

    return jsonWithCors(request, data, 201);
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}
