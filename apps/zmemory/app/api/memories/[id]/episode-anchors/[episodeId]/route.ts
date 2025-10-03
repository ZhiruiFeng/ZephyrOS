import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabaseServer } from '@/lib/config/supabase-server';
import {
  MemoryEpisodeAnchorUpdateSchema,
} from '@/validation';

export const dynamic = 'force-dynamic';

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
async function handlePut(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string; episodeId: string }> }
): Promise<NextResponse> {
  const { id: memoryId, episodeId } = await params;
  const userId = request.userId!;
  const validation = request.validatedBody!;

  if (!supabaseServer) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // Verify ownership of memory
  const { data: memoryCheck, error: memoryError } = await supabaseServer
    .from('memories')
    .select('id')
    .eq('id', memoryId)
    .eq('user_id', userId)
    .single();
  if (memoryError || !memoryCheck) {
    return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
  }

  // Check existing anchor
  const { data: existing, error: findErr } = await supabaseServer
    .from('memory_episode_anchors')
    .select('memory_id, episode_id, relation_type')
    .eq('memory_id', memoryId)
    .eq('episode_id', episodeId)
    .single();
  if (findErr || !existing) {
    return NextResponse.json({ error: 'Anchor not found' }, { status: 404 });
  }

  // If relation_type changed, ensure no conflict
  const payload: any = { ...validation };
  if (payload.relation_type && payload.relation_type !== existing.relation_type) {
    const { data: conflict } = await supabaseServer
      .from('memory_episode_anchors')
      .select('memory_id')
      .eq('memory_id', memoryId)
      .eq('episode_id', episodeId)
      .eq('relation_type', payload.relation_type)
      .single();
    if (conflict) {
      return NextResponse.json({ error: 'Anchor with this relation type already exists' }, { status: 409 });
    }
  }

  // Transform local_time_range
  if (payload.local_time_range) {
    const { start, end } = payload.local_time_range;
    payload.local_time_range = `[${start},${end || start})`;
  }

  const { data, error } = await supabaseServer
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
    return NextResponse.json({ error: 'Failed to update anchor' }, { status: 500 });
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

  return NextResponse.json(data);
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
async function handleDelete(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string; episodeId: string }> }
): Promise<NextResponse> {
  const { id: memoryId, episodeId } = await params;
  const userId = request.userId!;

  if (!supabaseServer) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const relationType = searchParams.get('relation_type');

  // Verify ownership
  const { data: memoryCheck, error: memoryError } = await supabaseServer
    .from('memories')
    .select('id')
    .eq('id', memoryId)
    .eq('user_id', userId)
    .single();
  if (memoryError || !memoryCheck) {
    return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
  }

  let del = supabaseServer
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
    return NextResponse.json({ error: 'Failed to delete anchor' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Anchor deleted successfully' });
}

export const PUT = withStandardMiddleware(handlePut, {
  validation: { bodySchema: MemoryEpisodeAnchorUpdateSchema },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 50
  }
});

export const DELETE = withStandardMiddleware(handleDelete, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 30
  }
});

export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';


