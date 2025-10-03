import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabase as serviceClient } from '@/lib/supabase';
import { getClientForAuthType } from '@/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/episodes/[id]/anchors - List memories anchored to an episode
 */
async function handleGetEpisodeAnchors(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: episodeId } = await params;
  const userId = request.userId!;
  const client = await getClientForAuthType(request) || serviceClient;

  if (!client) {
    return NextResponse.json([]);
  }

  // Ensure episode belongs to user
  const { data: episodeRow, error: epErr } = await client
    .from('episodes')
    .select('id, user_id')
    .eq('id', episodeId)
    .single();

  if (epErr || !episodeRow) {
    return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
  }

  if (episodeRow.user_id !== userId) {
    return NextResponse.json({ error: 'Episode belongs to different user' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const relationType = searchParams.get('relation_type') || undefined;
  const minWeight = searchParams.get('min_weight');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  let dbQuery = client
    .from('memory_episode_anchors')
    .select(`
      *,
      memory:memories!memory_id (
        id,
        title,
        note,
        tags,
        created_at,
        updated_at
      )
    `)
    .eq('episode_id', episodeId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (relationType) dbQuery = dbQuery.eq('relation_type', relationType);
  if (minWeight) dbQuery = dbQuery.gte('weight', parseFloat(minWeight));

  const { data, error } = await dbQuery;
  if (error) {
    return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
  }

  const transformed = (data || []).map((row: any) => {
    if (row.local_time_range) {
      try {
        const m = row.local_time_range.match(/^\[(.+),(.+)\]$/);
        if (m) {
          const [, start, end] = m;
          row.local_time_range = { start, end: end !== start ? end : undefined };
        }
      } catch {
        row.local_time_range = null;
      }
    }
    return row;
  });

  return NextResponse.json(transformed);
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetEpisodeAnchors, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
  }
});

// Explicit OPTIONS handler for CORS preflight
export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
