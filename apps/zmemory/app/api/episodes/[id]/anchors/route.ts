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

/**
 * List memories anchored to an episode
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: episodeId } = await params;
  try {
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    if (!supabase) {
      return jsonWithCors(request, []);
    }

    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = supabase;

    // Ensure episode belongs to user
    const { data: episodeRow, error: epErr } = await client
      .from('episodes')
      .select('id, user_id')
      .eq('id', episodeId)
      .single();
    if (epErr || !episodeRow) {
      return jsonWithCors(request, { error: 'Episode not found' }, 404);
    }
    if (episodeRow.user_id !== userId) {
      return jsonWithCors(request, { error: 'Episode belongs to different user' }, 403);
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
      console.error('Database error:', error);
      return jsonWithCors(request, { error: `Database error: ${error.message}` }, 500);
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

    return jsonWithCors(request, transformed);
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}


