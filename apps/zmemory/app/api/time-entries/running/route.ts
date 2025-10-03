import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabase as serviceClient } from '@/lib/supabase';
import { getClientForAuthType } from '@/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/time-entries/running - Get the currently running time entry
 */
async function handleGetRunningEntry(
  request: EnhancedRequest
): Promise<NextResponse> {
  const userId = request.userId!;
  const client = await getClientForAuthType(request) || serviceClient;

  if (!client) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await client
    .from('time_entries')
    .select('id, timeline_item_id, timeline_item_type, start_at')
    .eq('user_id', userId)
    .is('end_at', null)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch running timer' }, { status: 500 });
  }

  // Add backward compatibility field for frontend
  const responseData = data ? {
    ...data,
    // For backward compatibility, expose task_id if it's a task
    task_id: data.timeline_item_type === 'task' ? data.timeline_item_id : undefined,
  } : null;

  return NextResponse.json({ entry: responseData });
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetRunningEntry, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 300 // High limit for timer checks
  }
});

// Explicit OPTIONS handler for CORS preflight
export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
