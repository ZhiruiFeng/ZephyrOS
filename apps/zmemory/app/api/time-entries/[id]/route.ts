import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabase as serviceClient } from '@/lib/supabase';
import { getClientForAuthType } from '@/auth';
import { TimeEntryUpdateSchema } from '@/validation';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/time-entries/[id] - Update a time entry
 */
async function handleUpdateTimeEntry(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const userId = request.userId!;
  const data = request.validatedBody!;
  const client = await getClientForAuthType(request) || serviceClient;

  if (!client) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const updates: any = {};
  if (data.start_at !== undefined) updates.start_at = data.start_at;
  if (data.end_at !== undefined) updates.end_at = data.end_at;
  if (data.note !== undefined) updates.note = data.note;

  // Basic local validation when both provided
  if (updates.start_at && updates.end_at && new Date(updates.end_at) <= new Date(updates.start_at)) {
    return NextResponse.json({ error: 'end_at must be after start_at' }, { status: 400 });
  }

  const { data: updated, error } = await client
    .from('time_entries')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select('id, timeline_item_id, timeline_item_type, start_at, end_at, duration_minutes, note, source')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
  }

  return NextResponse.json({ entry: updated });
}

/**
 * DELETE /api/time-entries/[id] - Delete a time entry
 */
async function handleDeleteTimeEntry(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const userId = request.userId!;
  const client = await getClientForAuthType(request) || serviceClient;

  if (!client) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { error } = await client
    .from('time_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// Apply middleware
export const PUT = withStandardMiddleware(handleUpdateTimeEntry, {
  validation: { bodySchema: TimeEntryUpdateSchema },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
  }
});

export const DELETE = withStandardMiddleware(handleDeleteTimeEntry, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 50
  }
});

// Explicit OPTIONS handler for CORS preflight
export const OPTIONS = withStandardMiddleware(async () => {
  return new NextResponse(null, { status: 200 });
}, {
  auth: false
});
