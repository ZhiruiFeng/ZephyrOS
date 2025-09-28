import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClientForRequest, getUserIdFromRequest } from '@/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '@/lib/security';
import { 
  MemoryEpisodeAnchorUpdateSchema,
} from '@/validation';

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * @swagger
 * /api/memories/{id}/episode-anchors/{episodeId}:
 *   put:
 *     summary: Update a memory episode anchor
 *     tags: [Memory Anchors, Episodes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: episodeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Anchor updated
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; episodeId: string }> }
) {
  const { id: memoryId, episodeId } = await params;
  try {
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 50)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const body = await request.json();
    const validation = MemoryEpisodeAnchorUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid anchor data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    // RLS-safe client if available, else service role
    const client = createClientForRequest(request) || supabase;

    // Verify ownership of memory
    const { data: memoryCheck, error: memoryError } = await client
      .from('memories')
      .select('id')
      .eq('id', memoryId)
      .eq('user_id', userId)
      .single();
    if (memoryError || !memoryCheck) {
      return jsonWithCors(request, { error: 'Memory not found' }, 404);
    }

    // Check existing anchor
    const { data: existing, error: findErr } = await client
      .from('memory_episode_anchors')
      .select('memory_id, episode_id, relation_type')
      .eq('memory_id', memoryId)
      .eq('episode_id', episodeId)
      .single();
    if (findErr || !existing) {
      return jsonWithCors(request, { error: 'Anchor not found' }, 404);
    }

    // If relation_type changed, ensure no conflict
    const payload: any = { ...validation.data };
    if (payload.relation_type && payload.relation_type !== existing.relation_type) {
      const { data: conflict } = await client
        .from('memory_episode_anchors')
        .select('memory_id')
        .eq('memory_id', memoryId)
        .eq('episode_id', episodeId)
        .eq('relation_type', payload.relation_type)
        .single();
      if (conflict) {
        return jsonWithCors(request, { error: 'Anchor with this relation type already exists' }, 409);
      }
    }

    // Transform local_time_range
    if (payload.local_time_range) {
      const { start, end } = payload.local_time_range;
      payload.local_time_range = `[${start},${end || start})`;
    }

    const { data, error } = await client
      .from('memory_episode_anchors')
      .update(payload)
      .eq('memory_id', memoryId)
      .eq('episode_id', episodeId)
      .eq('relation_type', existing.relation_type)
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
      console.error('Database error:', error);
      return jsonWithCors(request, { error: 'Failed to update anchor' }, 500);
    }

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

    return jsonWithCors(request, data);
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

/**
 * @swagger
 * /api/memories/{id}/episode-anchors/{episodeId}:
 *   delete:
 *     summary: Delete a memory episode anchor
 *     tags: [Memory Anchors, Episodes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: episodeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: relation_type
 *         schema:
 *           type: string
 *           enum: [context_of, result_of, insight_from, about, co_occurred, triggered_by, reflects_on]
 *     responses:
 *       200:
 *         description: Anchor deleted
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; episodeId: string }> }
) {
  const { id: memoryId, episodeId } = await params;
  try {
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 30)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const { searchParams } = new URL(request.url);
    const relationType = searchParams.get('relation_type');

    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = createClientForRequest(request) || supabase;

    // Verify ownership
    const { data: memoryCheck, error: memoryError } = await client
      .from('memories')
      .select('id')
      .eq('id', memoryId)
      .eq('user_id', userId)
      .single();
    if (memoryError || !memoryCheck) {
      return jsonWithCors(request, { error: 'Memory not found' }, 404);
    }

    let del = client
      .from('memory_episode_anchors')
      .delete()
      .eq('memory_id', memoryId)
      .eq('episode_id', episodeId);

    if (relationType) {
      del = del.eq('relation_type', relationType);
    }

    const { error } = await del;
    if (error) {
      console.error('Database error:', error);
      return jsonWithCors(request, { error: 'Failed to delete anchor' }, 500);
    }

    return jsonWithCors(request, { message: 'Anchor deleted successfully' });
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}


