import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabaseServer } from '@/lib/supabase-server';
import {
  MemoryAnchorCreateSchema,
  MemoryAnchorsQuerySchema,
  type MemoryAnchorCreateBody,
  type MemoryAnchorsQuery
} from '@/validation';
import { nowUTC } from '@/lib/time-utils';

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
async function handleGet(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: memoryId } = await params;
  const userId = request.userId!;
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

  // First verify the memory belongs to the user
  const { data: memoryCheck, error: memoryError } = await supabaseServer!
    .from('memories')
    .select('id')
    .eq('id', memoryId)
    .eq('user_id', userId)
    .single();

  if (memoryError || !memoryCheck) {
    return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
  }

  // Build query with timeline item data
  let dbQuery = supabaseServer!
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

  return NextResponse.json(transformedData);
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
async function handlePost(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: memoryId } = await params;
  const userId = request.userId!;
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

  // Verify memory belongs to user
  const { data: allMemories, error: countError } = await supabaseServer!
    .from('memories')
    .select('id, user_id, title')
    .eq('id', memoryId);

  if (countError) {
    console.error('Memory count lookup error:', countError);
    return NextResponse.json({ error: `Memory count lookup failed: ${countError.message}` }, { status: 500 });
  }

  if (!allMemories || allMemories.length === 0) {
    console.error('Memory not found in database:', memoryId);
    return NextResponse.json({ error: 'Memory not found in database' }, { status: 404 });
  }

  if (allMemories.length > 1) {
    console.error('Multiple memories found with same ID:', { memoryId, count: allMemories.length, memories: allMemories });
    return NextResponse.json({ error: `Multiple memories found with ID ${memoryId}` }, { status: 500 });
  }

  const memoryCheck = allMemories[0];

  if (memoryCheck.user_id !== userId) {
    console.error('Memory belongs to different user:', { memoryUserId: memoryCheck.user_id, requestUserId: userId });
    return NextResponse.json({ error: 'Memory belongs to different user' }, { status: 403 });
  }

  // Verify anchor target exists and belongs to user
  const { data: anchorCheck, error: anchorError } = await supabaseServer!
    .from('timeline_items')
    .select('id, type, user_id')
    .eq('id', anchorData.anchor_item_id)
    .single();

  if (anchorError) {
    console.error('Timeline item lookup error:', anchorError);
    return NextResponse.json({ error: `Timeline item lookup failed: ${anchorError.message}` }, { status: 500 });
  }

  if (!anchorCheck) {
    return NextResponse.json({ error: 'Target timeline item not found' }, { status: 404 });
  }

  if (anchorCheck.user_id !== userId) {
    console.error('Timeline item belongs to different user:', { timelineItemUserId: anchorCheck.user_id, requestUserId: userId });
    return NextResponse.json({ error: 'Target timeline item belongs to different user' }, { status: 403 });
  }

  // Check if anchor already exists (prevent duplicates)
  const { data: existingAnchor } = await supabaseServer!
    .from('memory_anchors')
    .select('memory_id')
    .eq('memory_id', memoryId)
    .eq('anchor_item_id', anchorData.anchor_item_id)
    .eq('relation_type', anchorData.relation_type)
    .single();

  if (existingAnchor) {
    return NextResponse.json({ error: 'Anchor relationship already exists' }, { status: 409 });
  }

  // Create anchor
  const insertPayload = {
    memory_id: memoryId,
    ...transformedData,
    created_at: now
  };

  const { data, error } = await supabaseServer!
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
    return NextResponse.json({ error: `Failed to create anchor: ${error.message}` }, { status: 500 });
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

  return NextResponse.json(data, { status: 201 });
}

export const GET = withStandardMiddleware(handleGet, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 300 }
});

export const POST = withStandardMiddleware(handlePost, {
  validation: { bodySchema: MemoryAnchorCreateSchema },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 50 }
});
