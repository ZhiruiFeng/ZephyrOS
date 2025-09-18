import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserIdFromRequest } from '../../../../../lib/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '../../../../../lib/security';

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: timelineItemId } = await params;

  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const { searchParams } = new URL(request.url);
    const relationType = searchParams.get('relation_type');
    const minWeight = searchParams.get('min_weight');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

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

    if (!supabase) {
      return jsonWithCors(request, { error: 'Supabase not configured' }, 500);
    }

    const client = supabase;

    // Ensure timeline item exists and belongs to current user
    const { data: timelineItem, error: timelineError } = await client
      .from('timeline_items')
      .select('id, user_id')
      .eq('id', timelineItemId)
      .single();

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
    let dbQuery = client
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
      .eq('anchor_item_id', timelineItemId);

    // Apply filters
    if (relationType) {
      dbQuery = dbQuery.eq('relation_type', relationType);
    }
    if (minWeight) {
      dbQuery = dbQuery.gte('weight', parseFloat(minWeight));
    }

    // Apply pagination and ordering
    dbQuery = dbQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error } = await dbQuery;

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
