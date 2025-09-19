import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserIdFromRequest } from '../../../../../lib/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '../../../../../lib/security';

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const VALID_RELATION_TYPES = new Set([
  'context_of',
  'result_of',
  'insight_from',
  'about',
  'co_occurred',
  'triggered_by',
  'reflects_on'
]);

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
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: timelineItemId } = await context.params;

    // Rate limiting
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const { searchParams } = new URL(request.url);
    const relationType = searchParams.get('relation_type');
    if (relationType && !VALID_RELATION_TYPES.has(relationType)) {
      return jsonWithCors(request, { error: 'Invalid relation_type parameter' }, 400);
    }

    const minWeightParam = searchParams.get('min_weight');
    let parsedMinWeight: number | null = null;
    if (minWeightParam !== null) {
      parsedMinWeight = Number(minWeightParam);
      if (!Number.isFinite(parsedMinWeight) || parsedMinWeight < 0 || parsedMinWeight > 10) {
        return jsonWithCors(request, { error: 'min_weight must be a number between 0 and 10' }, 400);
      }
    }

    const limitParam = parseInt(searchParams.get('limit') ?? '50', 10);
    if (!Number.isFinite(limitParam) || limitParam < 1 || limitParam > 100) {
      return jsonWithCors(request, { error: 'limit must be between 1 and 100' }, 400);
    }

    const offsetParam = parseInt(searchParams.get('offset') ?? '0', 10);
    if (!Number.isFinite(offsetParam) || offsetParam < 0) {
      return jsonWithCors(request, { error: 'offset must be greater than or equal to 0' }, 400);
    }

    const limit = limitParam;
    const offset = offsetParam;

    // If Supabase is not configured, return mock anchors
    if (!supabase) {
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
      return jsonWithCors(request, mockAnchors);
    }

    // Enforce authentication (mock path already handled when supabase unavailable)
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    // Ensure timeline item exists and belongs to current user
    let timelineLookup;
    try {
      timelineLookup = await supabase
        .from('timeline_items')
        .select('id, user_id')
        .eq('id', timelineItemId)
        .single();
    } catch (timelineException) {
      console.error('Timeline item lookup threw:', timelineException);
      return jsonWithCors(request, { error: 'Timeline item lookup failed' }, 500);
    }

    const { data: timelineItem, error: timelineError } = timelineLookup;

    if (timelineError) {
      console.error('Timeline item lookup error:', timelineError);
      return jsonWithCors(request, { error: `Timeline item lookup failed: ${timelineError.message}` }, 500);
    }

    if (!timelineItem) {
      return jsonWithCors(request, { error: 'Timeline item not found' }, 404);
    }

    if (timelineItem.user_id !== userId) {
      console.error('Timeline item belongs to different user:', { timelineItemUserId: timelineItem.user_id, requestUserId: userId });
      return jsonWithCors(request, { error: 'Timeline item belongs to different user' }, 403);
    }

    // Build query to get memory anchors with memory data
    let dbQuery = supabase
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
      .range(offset, offset + limit - 1);

    if (relationType) {
      dbQuery = dbQuery.eq('relation_type', relationType);
    }

    if (parsedMinWeight !== null) {
      dbQuery = dbQuery.gte('weight', parsedMinWeight);
    }

    let queryResult;
    try {
      queryResult = await dbQuery;
    } catch (queryError) {
      console.error('Memory anchor query threw:', queryError);
      return jsonWithCors(request, { error: 'Failed to fetch memory anchors' }, 500);
    }

    const { data, error } = queryResult;

    if (error) {
      console.error('Database error:', error);
      return jsonWithCors(request, { error: `Database error: ${error.message}` }, 500);
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

    return jsonWithCors(request, transformedData);
  } catch (error) {
    console.error('API error:', error);
    console.error('Error stack:', (error as Error)?.stack);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: `Internal error: ${errorMessage}` }, 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}
