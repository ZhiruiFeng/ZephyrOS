import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabaseServer } from '@/lib/supabase-server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const VALID_RELATION_TYPES = new Set([
  'context_of',
  'result_of',
  'insight_from',
  'about',
  'co_occurred',
  'triggered_by',
  'reflects_on'
]);

const AnchorQuerySchema = z.object({
  relation_type: z.string().refine(val => VALID_RELATION_TYPES.has(val), {
    message: 'Invalid relation_type'
  }).optional(),
  min_weight: z.string().transform(val => parseFloat(val)).refine(val => val >= 0 && val <= 10, {
    message: 'min_weight must be between 0 and 10'
  }).optional(),
  limit: z.string().transform(val => parseInt(val) || 50).refine(val => val >= 1 && val <= 100, {
    message: 'limit must be between 1 and 100'
  }).optional(),
  offset: z.string().transform(val => parseInt(val) || 0).refine(val => val >= 0, {
    message: 'offset must be >= 0'
  }).optional(),
});

/**
 * @swagger
 * /api/timeline-items/{id}/anchors:
 *   get:
 *     summary: Get memory anchors for a timeline item
 *     description: Retrieve all memory anchors associated with a specific timeline item (task/activity)
 *     tags: [Memory Anchors, Timeline Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Timeline item ID
 *       - in: query
 *         name: relation_type
 *         schema:
 *           type: string
 *           enum: [context_of, result_of, insight_from, about, co_occurred, triggered_by, reflects_on]
 *         description: Filter by relation type
 *       - in: query
 *         name: min_weight
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 10
 *         description: Minimum relationship weight
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Maximum number of anchors to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of anchors to skip
 *     responses:
 *       200:
 *         description: List of memory anchors with populated memory data
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Timeline item belongs to different user
 *       404:
 *         description: Timeline item not found
 *       500:
 *         description: Server error
 */
async function handleGetAnchors(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const userId = request.userId!;
  const { id: timelineItemId } = await params;
  const { searchParams } = new URL(request.url);

  const queryResult = AnchorQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!queryResult.success) {
    return NextResponse.json({
      error: 'Invalid query parameters',
      details: queryResult.error.errors
    }, { status: 400 });
  }

  const { relation_type, min_weight, limit, offset } = queryResult.data;

  // If Supabase is not configured, return mock anchors
  if (!supabaseServer) {
    const mockAnchors = [
      {
        memory_id: '1',
        anchor_item_id: timelineItemId,
        relation_type: 'about',
        weight: 5,
        notes: 'Sample memory anchor',
        created_at: new Date().toISOString(),
        memory: {
          id: '1',
          title: 'Sample Memory',
          note: 'This is a sample memory for testing the UI',
          tags: ['sample', 'test'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }
    ];
    return NextResponse.json(mockAnchors);
  }

  // Ensure timeline item exists and belongs to current user
  const { data: timelineItem, error: timelineError } = await supabaseServer
    .from('timeline_items')
    .select('id, user_id')
    .eq('id', timelineItemId)
    .single();

  if (timelineError) {
    console.error('Timeline item lookup error:', timelineError);
    return NextResponse.json({ error: `Timeline item lookup failed: ${timelineError.message}` }, { status: 500 });
  }

  if (!timelineItem) {
    return NextResponse.json({ error: 'Timeline item not found' }, { status: 404 });
  }

  if (timelineItem.user_id !== userId) {
    console.error('Timeline item belongs to different user:', { timelineItemUserId: timelineItem.user_id, requestUserId: userId });
    return NextResponse.json({ error: 'Timeline item belongs to different user' }, { status: 403 });
  }

  // Build query to get memory anchors with memory data
  let dbQuery = supabaseServer
    .from('memory_anchors')
    .select(`
      *,
      memory:memories!memory_id (
        id,
        user_id,
        title,
        title_override,
        note,
        tags,
        created_at,
        updated_at
      )
    `)
    .eq('anchor_item_id', timelineItemId)
    .order('created_at', { ascending: false })
    .range(offset || 0, (offset || 0) + (limit || 50) - 1);

  if (relation_type) {
    dbQuery = dbQuery.eq('relation_type', relation_type);
  }

  if (min_weight !== undefined) {
    dbQuery = dbQuery.gte('weight', min_weight);
  }

  const { data, error } = await dbQuery;

  if (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
  }

  // Filter anchors to ensure they belong to the authenticated user (service role bypasses RLS)
  const userAnchors = (data || []).filter(anchor => anchor.memory?.user_id === userId);

  // Transform local_time_range from database format
  const transformedData = userAnchors.map(anchor => {
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

    // Normalize memory title for display
    if (anchor.memory) {
      const fallbackTitle = anchor.memory.title_override || anchor.memory.note?.slice(0, 80) || 'Untitled memory';
      anchor.memory.title = anchor.memory.title || fallbackTitle;
      delete (anchor.memory as any).user_id;
      delete (anchor.memory as any).title_override;
    }

    return anchor;
  });

  return NextResponse.json(transformedData);
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetAnchors, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
  }
});

// Explicit OPTIONS handler for CORS preflight
export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
