import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabaseServer } from '@/lib/config/supabase-server';
import { TimeEntriesQuerySchema, TimeEntryCreateSchema } from '@/validation';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/timeline-items/{id}/time-entries:
 *   get:
 *     summary: Get time entries for a timeline item
 *     description: Retrieve time entries associated with a specific timeline item
 *     tags: [Timeline Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Timeline item ID
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Time entries retrieved successfully
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Timeline item not found
 *       500:
 *         description: Server error
 */
async function handleGetTimeEntries(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const userId = request.userId!;
  const { id: timelineItemId } = await params;
  const searchParams = new URL(request.url).searchParams;

  const parsed = TimeEntriesQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json({
      error: 'Invalid query',
      details: parsed.error.errors
    }, { status: 400 });
  }

  const { from, to, limit, offset } = parsed.data;

  if (!supabaseServer) {
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({ entries: [] });
    }
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // Verify timeline item exists and belongs to user
  const { data: timelineItem, error: timelineError } = await supabaseServer
    .from('timeline_items')
    .select('id, type, title')
    .eq('id', timelineItemId)
    .eq('user_id', userId)
    .single();

  if (timelineError || !timelineItem) {
    return NextResponse.json({ error: 'Timeline item not found' }, { status: 404 });
  }

  let query = supabaseServer
    .from('time_entries')
    .select(`
      id, timeline_item_id,
      start_at, end_at, duration_minutes, note, source,
      category_id_snapshot,
      timeline_item:timeline_items(title, type),
      category:categories(name, color)
    `)
    .eq('user_id', userId)
    .eq('timeline_item_id', timelineItemId)
    .order('start_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (from) query = query.gte('start_at', from);
  if (to) query = query.lte('start_at', to);

  const { data, error } = await query;
  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('time-entries GET error (dev fallback):', error);
      return NextResponse.json({ entries: [] });
    }
    return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
  }

  // Map data to include joined fields
  const mappedEntries = (data || []).map((entry: any) => {
    const timeline_item = Array.isArray(entry.timeline_item) ? entry.timeline_item[0] : entry.timeline_item;
    const category = Array.isArray(entry.category) ? entry.category[0] : entry.category;
    return {
      ...entry,
      timeline_item_type: timeline_item?.type || timelineItem.type,
      timeline_item_title: timeline_item?.title || timelineItem.title,
      category_name: category?.name,
      category_color: category?.color,
      // For backward compatibility, expose task_id if it's a task
      ...(timeline_item?.type === 'task' && { task_id: entry.timeline_item_id }),
    };
  });

  return NextResponse.json({ entries: mappedEntries });
}

/**
 * @swagger
 * /api/timeline-items/{id}/time-entries:
 *   post:
 *     summary: Create a time entry for a timeline item
 *     description: Create a new time entry associated with a timeline item
 *     tags: [Timeline Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Timeline item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - start_at
 *             properties:
 *               start_at:
 *                 type: string
 *                 format: date-time
 *               end_at:
 *                 type: string
 *                 format: date-time
 *               note:
 *                 type: string
 *               source:
 *                 type: string
 *                 enum: [manual, timer]
 *     responses:
 *       201:
 *         description: Time entry created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Timeline item not found
 *       500:
 *         description: Server error
 */
async function handleCreateTimeEntry(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const userId = request.userId!;
  const { id: timelineItemId } = await params;
  const body = request.validatedBody!;

  if (!supabaseServer) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // Verify timeline item exists and belongs to user
  const { data: timelineItem, error: timelineError } = await supabaseServer
    .from('timeline_items')
    .select('id, type, title')
    .eq('id', timelineItemId)
    .eq('user_id', userId)
    .single();

  if (timelineError || !timelineItem) {
    return NextResponse.json({ error: 'Timeline item not found' }, { status: 404 });
  }

  const { start_at, end_at, note, source } = body;

  // Ensure start_at is available (should be guaranteed by validation)
  if (!start_at) {
    return NextResponse.json({ error: 'start_at is required' }, { status: 400 });
  }

  // If end_at provided, validate ordering client-side too (DB also enforces)
  if (end_at && new Date(end_at) <= new Date(start_at)) {
    return NextResponse.json({ error: 'end_at must be after start_at' }, { status: 400 });
  }

  // If this is a timer source and no end_at is provided (starting a timer),
  // check for running timers and stop them first
  if (source === 'timer' && !end_at) {
    const { data: running, error: runningErr } = await supabaseServer
      .from('time_entries')
      .select('id, timeline_item_id, timeline_item_type')
      .eq('user_id', userId)
      .is('end_at', null)
      .maybeSingle();

    if (runningErr) {
      return NextResponse.json({ error: 'Failed to check running timer' }, { status: 500 });
    }

    // If there's a running timer, stop it first
    if (running) {
      const { error: stopErr } = await supabaseServer
        .from('time_entries')
        .update({ end_at: new Date().toISOString() })
        .eq('id', running.id)
        .eq('user_id', userId);

      if (stopErr) {
        return NextResponse.json({ error: 'Failed to stop current timer' }, { status: 500 });
      }
    }
  }

  const entryPayload = {
    timeline_item_id: timelineItemId,
    start_at,
    end_at: end_at || null,
    note: note || null,
    source: source || 'manual',
    user_id: userId
  };

  const { data, error } = await supabaseServer
    .from('time_entries')
    .insert(entryPayload)
    .select(`
      id, timeline_item_id,
      start_at, end_at, duration_minutes, note, source,
      category_id_snapshot,
      timeline_item:timeline_items(title, type),
      category:categories(name, color)
    `)
    .single();

  if (error) {
    console.error('Time entry creation error:', error);
    return NextResponse.json({ error: 'Failed to create entry', details: error.message }, { status: 500 });
  }

  // Map entry to include joined fields
  const timeline_item = Array.isArray(data.timeline_item) ? data.timeline_item[0] : data.timeline_item;
  const category = Array.isArray(data.category) ? data.category[0] : data.category;
  const mappedEntry = {
    ...data,
    timeline_item_type: timeline_item?.type || timelineItem.type,
    timeline_item_title: timeline_item?.title || timelineItem.title,
    category_name: category?.name,
    category_color: category?.color,
    // For backward compatibility, expose task_id if it's a task
    ...((timeline_item?.type || timelineItem.type) === 'task' && { task_id: data.timeline_item_id }),
  };

  return NextResponse.json({ entry: mappedEntry }, { status: 201 });
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetTimeEntries, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 300
  }
});

export const POST = withStandardMiddleware(handleCreateTimeEntry, {
  validation: {
    bodySchema: TimeEntryCreateSchema
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
  }
});

// Explicit OPTIONS handler for CORS preflight
export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
