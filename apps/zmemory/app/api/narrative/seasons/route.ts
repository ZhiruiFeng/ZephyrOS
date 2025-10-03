import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabase as serviceClient } from '@/lib/supabase';
import { getClientForAuthType, addUserIdIfNeeded } from '@/auth';
import type {
  CreateSeasonRequest,
  SeasonsResponse,
  SeasonTheme,
  SeasonStatus
} from '../../../../types/narrative';

export const dynamic = 'force-dynamic';

// Validation helpers
function isValidSeasonTheme(theme: string): theme is SeasonTheme {
  return ['spring', 'summer', 'autumn', 'winter'].includes(theme);
}

function isValidSeasonStatus(status: string): status is SeasonStatus {
  return ['active', 'completed', 'paused'].includes(status);
}

/**
 * GET /api/narrative/seasons - Get all seasons for the authenticated user
 *
 * Query params: status, limit, offset
 */
async function handleGetSeasons(
  request: EnhancedRequest
): Promise<NextResponse> {
  const userId = request.userId!;
  const client = await getClientForAuthType(request) || serviceClient;

  if (!client) {
    return NextResponse.json({ message: 'Database connection not available' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  // Build query
  let query = client
    .from('seasons')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Add status filter if provided
  if (status && isValidSeasonStatus(status)) {
    query = query.eq('status', status);
  }

  const { data: seasons, error, count } = await query;

  if (error) {
    return NextResponse.json({ message: 'Failed to fetch seasons' }, { status: 500 });
  }

  const response: SeasonsResponse = {
    seasons: seasons || [],
    total: count || 0,
    has_more: (count || 0) > offset + limit
  };

  return NextResponse.json(response);
}

/**
 * POST /api/narrative/seasons - Create a new season
 */
async function handleCreateSeason(
  request: EnhancedRequest
): Promise<NextResponse> {
  const userId = request.userId!;
  const client = await getClientForAuthType(request) || serviceClient;

  if (!client) {
    return NextResponse.json({ message: 'Database connection not available' }, { status: 503 });
  }

  const body: CreateSeasonRequest = await request.json();

  // Validation
  if (!body.title?.trim()) {
    return NextResponse.json({ message: 'Title is required' }, { status: 400 });
  }

  if (!body.theme || !isValidSeasonTheme(body.theme)) {
    return NextResponse.json({ message: 'Valid theme is required (spring, summer, autumn, winter)' }, { status: 400 });
  }

  // Check if user is trying to create multiple active seasons
  if (!body.start_date) {
    const { data: activeSeasons } = await client
      .from('seasons')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (activeSeasons && activeSeasons.length > 0) {
      return NextResponse.json({ message: 'You can only have one active season at a time. Please complete or pause your current season first.' }, { status: 400 });
    }
  }

  // Create season
  const seasonData: any = {
    title: body.title.trim(),
    intention: body.intention?.trim() || null,
    theme: body.theme,
    start_date: body.start_date || new Date().toISOString().split('T')[0],
    opening_ritual: body.opening_ritual || {},
    status: 'active' as const,
    metadata: {}
  };

  // Add user_id to payload
  await addUserIdIfNeeded(seasonData, userId, request);

  const { data: season, error } = await client
    .from('seasons')
    .insert(seasonData)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: 'Failed to create season' }, { status: 500 });
  }

  return NextResponse.json(season, { status: 201 });
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetSeasons, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
  }
});

export const POST = withStandardMiddleware(handleCreateSeason, {
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
