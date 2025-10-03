import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createActivityService } from '@/services';
import { getDatabaseClient } from '@/database';
import { TimeEntriesQuerySchema, TimeEntryCreateSchema } from '@/validation';
import { addUserIdIfNeeded } from '@/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/activities/[id]/time-entries - Get time entries for an activity
 */
async function handleGetTimeEntries(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: activityId } = await params;
  const query = request.validatedQuery!;
  const userId = request.userId!;

  if (!activityId) {
    const error = new Error('Activity ID is required');
    (error as any).code = '400';
    throw error;
  }

  // Verify activity exists and user owns it
  const activityService = createActivityService({ userId });
  const activityResult = await activityService.getActivity(activityId);

  if (activityResult.error) {
    throw activityResult.error;
  }

  // Fetch time entries directly from database
  const client = getDatabaseClient();

  let dbQuery = client
    .from('time_entries')
    .select(`
      id, timeline_item_id, timeline_item_type, timeline_item_title,
      start_at, end_at, duration_minutes, note, source,
      category_id_snapshot,
      timeline_item:timeline_items(title, type),
      category:categories(name, color)
    `)
    .eq('user_id', userId)
    .eq('timeline_item_id', activityId)
    .eq('timeline_item_type', 'activity')
    .order('start_at', { ascending: false })
    .range(query.offset || 0, (query.offset || 0) + (query.limit || 50) - 1);

  if (query.from) dbQuery = dbQuery.gte('start_at', query.from);
  if (query.to) dbQuery = dbQuery.lte('start_at', query.to);

  const { data, error } = await dbQuery;

  if (error) {
    console.error('Database error fetching time entries:', error);
    const dbError = new Error('Failed to fetch time entries');
    (dbError as any).code = '500';
    throw dbError;
  }

  // Map to include activity_id for backward compatibility
  const entries = (data || []).map(entry => ({
    ...entry,
    activity_id: entry.timeline_item_id
  }));

  return NextResponse.json({ entries });
}

/**
 * POST /api/activities/[id]/time-entries - Create a time entry for an activity
 */
async function handleCreateTimeEntry(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: activityId } = await params;
  const data = request.validatedBody!;
  const userId = request.userId!;

  if (!activityId) {
    const error = new Error('Activity ID is required');
    (error as any).code = '400';
    throw error;
  }

  // Verify activity exists and user owns it
  const activityService = createActivityService({ userId });
  const activityResult = await activityService.getActivity(activityId);

  if (activityResult.error) {
    throw activityResult.error;
  }

  const client = getDatabaseClient();

  // If this is a timer source and no end_at is provided (starting a timer),
  // check for running timers and stop them first
  if (data.source === 'timer' && !data.end_at) {
    const { data: running, error: runningErr } = await client
      .from('time_entries')
      .select('id, timeline_item_id, timeline_item_type')
      .eq('user_id', userId)
      .is('end_at', null)
      .maybeSingle();

    if (runningErr) {
      console.error('Error checking running timer:', runningErr);
      const error = new Error('Failed to check running timer');
      (error as any).code = '500';
      throw error;
    }

    // If there's a running timer, stop it first
    if (running) {
      const { error: stopErr } = await client
        .from('time_entries')
        .update({ end_at: new Date().toISOString() })
        .eq('id', running.id)
        .eq('user_id', userId);

      if (stopErr) {
        console.error('Error stopping current timer:', stopErr);
        const error = new Error('Failed to stop current timer');
        (error as any).code = '500';
        throw error;
      }
    }
  }

  const timeEntryData = {
    ...data,
    timeline_item_id: activityId,
    timeline_item_type: 'activity',
    source: data.source || 'manual'
  };

  // Add user_id to payload (always needed since we use service role client)
  await addUserIdIfNeeded(timeEntryData, userId, request);

  const { data: result, error } = await client
    .from('time_entries')
    .insert(timeEntryData)
    .select(`
      id, timeline_item_id, timeline_item_type, timeline_item_title,
      start_at, end_at, duration_minutes, note, source,
      category_id_snapshot,
      timeline_item:timeline_items(title, type),
      category:categories(name, color)
    `)
    .single();

  if (error) {
    console.error('Database error creating time entry:', error);
    const dbError = new Error('Failed to create time entry');
    (dbError as any).code = '500';
    throw dbError;
  }

  // Add activity_id for backward compatibility
  const response = {
    ...result,
    activity_id: result.timeline_item_id
  };

  return NextResponse.json(response, { status: 201 });
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetTimeEntries, {
  validation: { querySchema: TimeEntriesQuerySchema },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 300 // Higher limit for listing
  }
});

export const POST = withStandardMiddleware(handleCreateTimeEntry, {
  validation: { bodySchema: TimeEntryCreateSchema },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100 // Moderate limit for creation
  }
});

// Explicit OPTIONS handler for CORS preflight
export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
