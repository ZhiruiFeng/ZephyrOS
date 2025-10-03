import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabaseServer } from '@/lib/config/supabase-server';
import { MemoriesQuerySchema } from '@/validation';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/timeline-items/memories:
 *   get:
 *     summary: Get memory timeline items with Memory-specific filtering
 *     description: Retrieve memory timeline items with rich filtering options including emotional, temporal, and salience-based filtering
 *     tags: [Timeline Items, Memory Integration]
 *     parameters:
 *       - in: query
 *         name: memory_type
 *         schema:
 *           type: string
 *           enum: [note, link, file, thought, quote, insight]
 *       - in: query
 *         name: emotion_valence_min
 *         schema:
 *           type: integer
 *       - in: query
 *         name: is_highlight
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: min_salience
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of memory timeline items
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
async function handleGetMemories(
  request: EnhancedRequest
): Promise<NextResponse> {
  const userId = request.userId!;
  const { searchParams } = new URL(request.url);

  const queryResult = MemoriesQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!queryResult.success) {
    return NextResponse.json({
      error: 'Invalid query parameters',
      details: queryResult.error.errors
    }, { status: 400 });
  }

  const query = queryResult.data;

  if (!supabaseServer) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  let dbQuery = supabaseServer
    .from('timeline_items')
    .select(`
      *,
      category:categories(id, name, color, icon),
      memory:memories!inner(
        captured_at,
        happened_range,
        note,
        title_override,
        memory_type,
        emotion_valence,
        emotion_arousal,
        energy_delta,
        place_name,
        latitude,
        longitude,
        is_highlight,
        salience_score,
        source,
        context,
        mood,
        importance_level,
        related_to,
        tags,
        status
      )
    `)
    .eq('user_id', userId)
    .eq('type', 'memory');

  // Apply filters
  if (query.memory_type) dbQuery = dbQuery.eq('memories.memory_type', query.memory_type);
  if (query.min_emotion_valence !== undefined) dbQuery = dbQuery.gte('memories.emotion_valence', query.min_emotion_valence);
  if (query.max_emotion_valence !== undefined) dbQuery = dbQuery.lte('memories.emotion_valence', query.max_emotion_valence);
  if (query.is_highlight !== undefined) dbQuery = dbQuery.eq('memories.is_highlight', query.is_highlight);
  if (query.min_salience !== undefined) dbQuery = dbQuery.gte('memories.salience_score', query.min_salience);
  if (query.place_name) dbQuery = dbQuery.ilike('memories.place_name', `%${query.place_name}%`);
  if (query.importance_level) dbQuery = dbQuery.eq('memories.importance_level', query.importance_level);
  if (query.captured_from) dbQuery = dbQuery.gte('memories.captured_at', query.captured_from);
  if (query.captured_to) dbQuery = dbQuery.lte('memories.captured_at', query.captured_to);
  if (query.tags) {
    const tagList = query.tags.split(',').map(t => t.trim());
    dbQuery = dbQuery.overlaps('memories.tags', tagList);
  }
  if (query.search) {
    dbQuery = dbQuery.or(`title.ilike.%${query.search}%,memories.note.ilike.%${query.search}%,memories.context.ilike.%${query.search}%`);
  }

  // Sorting
  const ascending = query.sort_order === 'asc';
  dbQuery = dbQuery.order(query.sort_by === 'captured_at' ? 'memories.captured_at' : query.sort_by === 'salience_score' ? 'memories.salience_score' : 'created_at', { ascending });

  // Pagination
  dbQuery = dbQuery.range(query.offset || 0, (query.offset || 0) + (query.limit || 20) - 1);

  const { data, error } = await dbQuery;

  if (error) {
    console.error('Memories query error:', error);
    return NextResponse.json({ error: 'Failed to fetch memories' }, { status: 500 });
  }

  // Transform to flatten memory fields
  const transformedData = (data || []).map((item: any) => {
    const memory = Array.isArray(item.memory) ? item.memory[0] : item.memory;
    return {
      ...item,
      ...memory,
      display_title: memory?.title_override || item.title,
      memory: undefined
    };
  });

  return NextResponse.json({
    items: transformedData,
    count: transformedData.length,
    has_more: transformedData.length === (query.limit || 20)
  });
}

export const GET = withStandardMiddleware(handleGetMemories, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 300
  }
});

export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
