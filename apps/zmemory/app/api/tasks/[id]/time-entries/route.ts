import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabase as serviceClient } from '@/lib/config/supabase';
import { getClientForAuthType, addUserIdIfNeeded } from '@/auth';
import { TimeEntriesQuerySchema, TimeEntryCreateSchema } from '@/validation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tasks/[id]/time-entries - Get time entries for a task
 *
 * Query params: from (ISO timestamp), to (ISO timestamp), limit, offset
 */
async function handleGetTaskTimeEntries(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: taskId } = await params;
  const userId = request.userId!;
  const client = await getClientForAuthType(request) || serviceClient;

  if (!client) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = TimeEntriesQuerySchema.safeParse(Object.fromEntries(searchParams));

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', details: parsed.error.errors }, { status: 400 });
  }

  const { from, to, limit, offset } = parsed.data;

  let query = client
    .from('time_entries')
    .select(`
      id, timeline_item_id, timeline_item_type, timeline_item_title,
      start_at, end_at, duration_minutes, note, source,
      category_id_snapshot,
      timeline_item:timeline_items(title, type),
      category:categories(name, color)
    `)
    .eq('user_id', userId)
    .eq('timeline_item_id', taskId)
    .eq('timeline_item_type', 'task')
    .order('start_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (from) query = query.gte('start_at', from);
  if (to) query = query.lte('start_at', to);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
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
      task_id: entry.timeline_item_id,
    };
  });

  return NextResponse.json({ entries: mappedEntries });
}

/**
 * POST /api/tasks/[id]/time-entries - Create a manual time entry for a task
 */
async function handleCreateTaskTimeEntry(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: taskId } = await params;
  const userId = request.userId!;
  const body = request.validatedBody!;
  const client = await getClientForAuthType(request) || serviceClient;

  if (!client) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { start_at, end_at, note } = body;

  if (!start_at) {
    return NextResponse.json({ error: 'start_at is required' }, { status: 400 });
  }

  // If end_at provided, validate ordering
  if (end_at && new Date(end_at) <= new Date(start_at)) {
    return NextResponse.json({ error: 'end_at must be after start_at' }, { status: 400 });
  }

  const entryPayload: any = {
    timeline_item_id: taskId,
    start_at,
    end_at: end_at || null,
    note: note || null,
    source: 'manual',
  };

  // Add user_id to payload
  await addUserIdIfNeeded(entryPayload, userId, request);

  const { data, error } = await client
    .from('time_entries')
    .insert(entryPayload)
    .select(`
      id, timeline_item_id, timeline_item_type, timeline_item_title,
      start_at, end_at, duration_minutes, note, source,
      category_id_snapshot,
      timeline_item:timeline_items(title, type),
      category:categories(name, color)
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
  }

  // Map entry to include joined fields
  const timeline_item = Array.isArray(data.timeline_item) ? data.timeline_item[0] : data.timeline_item;
  const category = Array.isArray(data.category) ? data.category[0] : data.category;
  const mappedEntry = {
    ...data,
    task_title: data.timeline_item_title || timeline_item?.title,
    category_name: category?.name,
    category_color: category?.color,
    task_id: data.timeline_item_id,
  };

  return NextResponse.json({ entry: mappedEntry }, { status: 201 });
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetTaskTimeEntries, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 300
  }
});

export const POST = withStandardMiddleware(handleCreateTaskTimeEntry, {
  validation: { bodySchema: TimeEntryCreateSchema },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
  }
});

// Explicit OPTIONS handler for CORS preflight
export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
