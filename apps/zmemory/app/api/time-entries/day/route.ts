import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabase as serviceClient } from '@/lib/config/supabase';
import { getClientForAuthType } from '@/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/time-entries/day - Query time entries within a time window
 *
 * Query params: from (ISO timestamp), to (ISO timestamp)
 * Returns entries that overlap the [from, to] window.
 */
async function handleGetDayEntries(
  request: EnhancedRequest
): Promise<NextResponse> {
  const userId = request.userId!;
  const client = await getClientForAuthType(request) || serviceClient;

  if (!client) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';

  if (!from || !to) {
    return NextResponse.json({ error: 'from/to required' }, { status: 400 });
  }

  // Fetch entries that overlap [from, to]
  // start_at < to AND (end_at IS NULL OR end_at >= from)
  const { data, error } = await client
    .from('time_entries')
    .select(`
      id,
      timeline_item_id,
      timeline_item_type,
      timeline_item_title,
      start_at,
      end_at,
      duration_minutes,
      note,
      source,
      category_id_snapshot,
      timeline_item:timeline_items(title, type),
      category:categories(id, name, color)
    `)
    .eq('user_id', userId)
    .lt('start_at', to)
    .or(`end_at.is.null,end_at.gte.${from}`)
    .order('start_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch day entries' }, { status: 500 });
  }

  // Map data to include joined fields
  const mappedEntries = (data || []).map((entry: any) => {
    const timeline_item = Array.isArray(entry.timeline_item) ? entry.timeline_item[0] : entry.timeline_item;
    const category = Array.isArray(entry.category) ? entry.category[0] : entry.category;
    return {
      ...entry,
      task_title: entry.timeline_item_title || timeline_item?.title,
      category_name: category?.name,
      category_color: category?.color,
      // Keep task_id for backward compatibility if it's a task
      task_id: entry.timeline_item_type === 'task' ? entry.timeline_item_id : undefined,
    };
  });

  return NextResponse.json({ entries: mappedEntries });
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetDayEntries, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 300 // High limit for day view queries
  }
});

// Explicit OPTIONS handler for CORS preflight
export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
