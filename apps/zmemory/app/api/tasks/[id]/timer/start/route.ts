import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabase as serviceClient } from '@/lib/supabase';
import { getClientForAuthType, addUserIdIfNeeded } from '@/auth';
import { TimerStartSchema } from '@/validation';

export const dynamic = 'force-dynamic';

/**
 * POST /api/tasks/[id]/timer/start - Start a timer for a task
 *
 * Starts a new time entry for the given task. If another timer is running,
 * behavior depends on the autoSwitch parameter.
 */
async function handleStartTimer(
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

  const { autoSwitch } = body;

  // Ensure task belongs to user
  const { data: taskRow, error: taskErr } = await client
    .from('tasks')
    .select('id')
    .eq('id', taskId)
    .eq('user_id', userId)
    .single();

  if (taskErr || !taskRow) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // Check existing running entry
  const { data: running, error: runningErr } = await client
    .from('time_entries')
    .select('id, timeline_item_id, timeline_item_type, start_at')
    .eq('user_id', userId)
    .is('end_at', null)
    .maybeSingle();

  if (runningErr) {
    return NextResponse.json({ error: 'Failed to check running timer' }, { status: 500 });
  }

  if (running && running.timeline_item_id === taskId) {
    // Already running on this task: idempotent
    const responseData = {
      ...running,
      task_id: running.timeline_item_id,
    };
    return NextResponse.json({ entry: responseData });
  }

  if (running && !autoSwitch) {
    return NextResponse.json({ error: 'Another timer is running', running }, { status: 409 });
  }

  // If autoSwitch and there is a running entry, stop it first
  if (running && autoSwitch) {
    const { error: stopErr } = await client
      .from('time_entries')
      .update({ end_at: new Date().toISOString() })
      .eq('id', running.id)
      .eq('user_id', userId);

    if (stopErr) {
      return NextResponse.json({ error: 'Failed to stop current timer' }, { status: 500 });
    }
  }

  // Start new entry
  const payload: any = {
    timeline_item_id: taskId,
    start_at: new Date().toISOString(),
    source: 'timer' as const,
  };

  // Add user_id to payload
  await addUserIdIfNeeded(payload, userId, request);

  const { data: inserted, error: insertErr } = await client
    .from('time_entries')
    .insert(payload)
    .select('id, timeline_item_id, timeline_item_type, start_at')
    .single();

  if (insertErr) {
    // Unique constraint may fail if race: surface 409
    if ((insertErr as any).code === '23505') {
      return NextResponse.json({ error: 'Another timer is running' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to start timer' }, { status: 500 });
  }

  // Add backward compatibility field
  const responseData = {
    ...inserted,
    task_id: inserted.timeline_item_id,
  };

  return NextResponse.json({ entry: responseData }, { status: 201 });
}

// Apply middleware
export const POST = withStandardMiddleware(handleStartTimer, {
  validation: { bodySchema: TimerStartSchema },
  rateLimit: {
    windowMs: 60 * 1000,
    maxRequests: 30 // Allow frequent timer starts
  }
});

// Explicit OPTIONS handler for CORS preflight
export const OPTIONS = withStandardMiddleware(async () => {
  return new NextResponse(null, { status: 200 });
}, {
  auth: false
});
