import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabase as serviceClient } from '@/lib/supabase';
import { getClientForAuthType } from '@/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/narrative/seasons/current - Get the current active season
 *
 * Returns the most recent active season for the authenticated user.
 */
async function handleGetCurrentSeason(
  request: EnhancedRequest
): Promise<NextResponse> {
  const userId = request.userId!;
  const client = await getClientForAuthType(request) || serviceClient;

  if (!client) {
    return NextResponse.json({ message: 'Database connection not available' }, { status: 503 });
  }

  const { data: season, error } = await client
    .from('seasons')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ message: 'Failed to fetch current season' }, { status: 500 });
  }

  if (!season) {
    return NextResponse.json({ message: 'No active season found' }, { status: 404 });
  }

  return NextResponse.json(season);
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetCurrentSeason, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
  }
});

// Explicit OPTIONS handler for CORS preflight
export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
