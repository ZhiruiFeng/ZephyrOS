import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabase as serviceClient } from '@/lib/supabase';
import { getClientForAuthType } from '@/auth';
import { TimerStopSchema } from '@/validation';

export const dynamic = 'force-dynamic';

/**
 * POST /api/tasks/[id]/timer/stop - Stop the running timer for a task
 */
async function handleStopTimer(
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

  const overrideEndAt = body.overrideEndAt;
  const endAt = overrideEndAt ? new Date(overrideEndAt).toISOString() : new Date().toISOString();

  // Find running entry for this user (optionally verify task id)
  const { data: running, error: runningErr } = await client
    .from('time_entries')
    .select('id, timeline_item_id, timeline_item_type, start_at')
    .eq('user_id', userId)
    .is('end_at', null)
    .maybeSingle();

  if (runningErr) {
    return NextResponse.json({ error: 'Failed to fetch running entry' }, { status: 500 });
  }

  if (!running) {
    // Idempotent: nothing running
    return NextResponse.json({ entry: null });
  }

  if (running.timeline_item_id !== taskId) {
    // Allow stop via specific task endpoint only for its running entry
    return NextResponse.json({ error: 'No running timer for this task' }, { status: 404 });
  }

  // Basic validation when override provided: endAt must be <= now and > start_at
  if (overrideEndAt) {
    const nowIso = new Date().toISOString();
    if (endAt > nowIso) {
      return NextResponse.json({ error: 'End time cannot be in the future' }, { status: 400 });
    }
    if (endAt <= running.start_at) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
    }
  }

  const { data: updated, error: updateErr } = await client
    .from('time_entries')
    .update({ end_at: endAt })
    .eq('id', running.id)
    .eq('user_id', userId)
    .select('id, timeline_item_id, timeline_item_type, start_at, end_at, duration_minutes')
    .single();

  if (updateErr) {
    return NextResponse.json({ error: 'Failed to stop timer' }, { status: 500 });
  }

  // Add backward compatibility field for frontend
  const responseData = {
    ...updated,
    task_id: updated.timeline_item_id, // For task timers, timeline_item_id is the task_id
  };

  return NextResponse.json({ entry: responseData });
}

// Apply middleware
export const POST = withStandardMiddleware(handleStopTimer, {
  validation: { bodySchema: TimerStopSchema },
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60 // Allow frequent timer stops
  }
});

// Explicit OPTIONS handler for CORS preflight
export const OPTIONS = withStandardMiddleware(async () => {
  return new NextResponse(null, { status: 200 });
}, {
  auth: false // OPTIONS requests don't need authentication
});
