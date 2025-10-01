import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getClientForAuthType, getUserIdFromRequest } from '@/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '@/lib/security';
import {
  MemoryEpisodeAnchorCreateSchema,
  MemoryEpisodeAnchorsQuerySchema,
  type MemoryEpisodeAnchorCreateBody,
  type MemoryEpisodeAnchorsQuery
} from '@/validation';
import { nowUTC } from '@/lib/time-utils';

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

/**
 * @swagger
 * /api/memories/{id}/episode-anchors:
 *   get:
 *     summary: Get memory episode anchors
 *     description: Retrieve all episode anchor relationships for a specific memory
 *     tags: [Memory Anchors, Episodes]
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
 *       - in: query
 *         name: min_weight
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 10
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *     responses:
 *       200:
 *         description: List of memory episode anchors with populated episode data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: memoryId } = await params;
  try {
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const { searchParams } = new URL(request.url);
    const queryResult = MemoryEpisodeAnchorsQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryResult.error.errors },
        { status: 400 }
      );
    }

    const query = queryResult.data;

    if (!supabase) {
      // No DB configured: return empty list for consistency
      return jsonWithCors(request, []);
    }

    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = await getClientForAuthType(request) || supabase;

    // Verify the memory belongs to user
    const { data: memoryCheck, error: memoryError } = await client
      .from('memories')
      .select('id')
      .eq('id', memoryId)
      .eq('user_id', userId)
      .single();

    if (memoryError || !memoryCheck) {
      return jsonWithCors(request, { error: 'Memory not found' }, 404);
    }

    // Build query with episode data
    let dbQuery = client
      .from('memory_episode_anchors')
      .select(`
        *,
        episode:episodes!episode_id (
          id,
          season_id,
          user_id,
          title,
          date_range_start,
          date_range_end,
          mood_emoji,
          reflection,
          created_at,
          updated_at
        )
      `)
      .eq('memory_id', memoryId);

    if (query.relation_type) {
      dbQuery = dbQuery.eq('relation_type', query.relation_type);
    }
    if (query.min_weight !== undefined) {
      dbQuery = dbQuery.gte('weight', query.min_weight!);
    }

    dbQuery = dbQuery
      .order('created_at', { ascending: false })
      .range(query.offset, query.offset + query.limit - 1);

    const { data, error } = await dbQuery;
    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch memory episode anchors' }, { status: 500 });
    }

    const transformed = (data || []).map(anchor => {
      if (anchor.local_time_range) {
        try {
          const rangeMatch = anchor.local_time_range.match(/^\[(.+),(.+)\]$/);
          if (rangeMatch) {
            const [, start, end] = rangeMatch;
            anchor.local_time_range = { start, end: end !== start ? end : undefined };
          }
        } catch {
          anchor.local_time_range = null;
        }
      }
      if (anchor.episode) {
        delete (anchor.episode as any).user_id;
      }
      return anchor;
    });

    return jsonWithCors(request, transformed);
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

/**
 * @swagger
 * /api/memories/{id}/episode-anchors:
 *   post:
 *     summary: Create a memory episode anchor
 *     description: Create a new anchor relationship between a memory and an episode
 *     tags: [Memory Anchors, Episodes]
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
 *             $ref: '#/components/schemas/MemoryEpisodeAnchorCreate'
 *     responses:
 *       201:
 *         description: Memory episode anchor created successfully
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: memoryId } = await params;
  try {
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 50)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const body = await request.json();
    const validation = MemoryEpisodeAnchorCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid anchor data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const anchorData = validation.data;
    const now = nowUTC();

    if (!supabase) {
      const mock = { memory_id: memoryId, ...anchorData, created_at: now };
      return jsonWithCors(request, mock, 201);
    }

    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = supabase; // service role for explicit checks

    // Verify memory ownership
    const { data: memoryRow, error: memoryErr } = await client
      .from('memories')
      .select('id, user_id')
      .eq('id', memoryId)
      .single();
    if (memoryErr || !memoryRow) {
      return jsonWithCors(request, { error: 'Memory not found in database' }, 404);
    }
    if (memoryRow.user_id !== userId) {
      return jsonWithCors(request, { error: 'Memory belongs to different user' }, 403);
    }

    // Verify episode ownership
    const { data: episodeRow, error: episodeErr } = await client
      .from('episodes')
      .select('id, user_id')
      .eq('id', anchorData.episode_id)
      .single();
    if (episodeErr || !episodeRow) {
      return jsonWithCors(request, { error: 'Episode not found' }, 404);
    }
    if (episodeRow.user_id !== userId) {
      return jsonWithCors(request, { error: 'Episode belongs to different user' }, 403);
    }

    // Check duplicate
    const { data: existing } = await client
      .from('memory_episode_anchors')
      .select('memory_id')
      .eq('memory_id', memoryId)
      .eq('episode_id', anchorData.episode_id)
      .eq('relation_type', anchorData.relation_type)
      .single();
    if (existing) {
      return jsonWithCors(request, { error: 'Anchor relationship already exists' }, 409);
    }

    // Transform local_time_range
    const insertPayload: any = { ...anchorData };
    if (anchorData.local_time_range) {
      const { start, end } = anchorData.local_time_range;
      insertPayload.local_time_range = `[${start},${end || start})`;
    }

    // Insert
    const { data, error } = await client
      .from('memory_episode_anchors')
      .insert({ memory_id: memoryId, ...insertPayload, created_at: now })
      .select(`
        *,
        episode:episodes!episode_id (
          id,
          season_id,
          title,
          date_range_start,
          date_range_end,
          mood_emoji,
          reflection
        )
      `)
      .single();

    if (error) {
      console.error('Database insert error:', error);
      return jsonWithCors(request, { error: `Failed to create anchor: ${error.message}` }, 500);
    }

    // Transform back local_time_range in response
    if (data.local_time_range) {
      try {
        const m = data.local_time_range.match(/^\[(.+),(.+)\]$/);
        if (m) {
          const [, start, end] = m;
          data.local_time_range = { start, end: end !== start ? end : undefined };
        }
      } catch {
        data.local_time_range = null;
      }
    }

    if (data.episode) {
      delete (data.episode as any).user_id;
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


