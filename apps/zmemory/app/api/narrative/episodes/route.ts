import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabase as serviceClient } from '@/lib/supabase';
import { getClientForAuthType, addUserIdIfNeeded } from '@/auth';
import type {
  CreateEpisodeRequest,
  EpisodesResponse
} from '../../../../types/narrative';

export const dynamic = 'force-dynamic';

/**
 * GET /api/narrative/episodes - Get episodes for the authenticated user
 *
 * Query params: season_id, limit, offset, date_from, date_to
 */
async function handleGetEpisodes(
  request: EnhancedRequest
): Promise<NextResponse> {
  const userId = request.userId!;
  const client = await getClientForAuthType(request) || serviceClient;

  if (!client) {
    return NextResponse.json({ message: 'Database connection not available' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const seasonId = searchParams.get('season_id');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');

  // Build query
  let query = client
    .from('episodes')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('date_range_start', { ascending: false })
    .range(offset, offset + limit - 1);

  // Add filters
  if (seasonId) {
    query = query.eq('season_id', seasonId);
  }

  if (dateFrom) {
    query = query.gte('date_range_end', dateFrom);
  }

  if (dateTo) {
    query = query.lte('date_range_start', dateTo);
  }

  const { data: episodes, error, count } = await query;

  if (error) {
    return NextResponse.json({ message: 'Failed to fetch episodes' }, { status: 500 });
  }

  const response: EpisodesResponse = {
    episodes: episodes || [],
    total: count || 0,
    has_more: (count || 0) > offset + limit
  };

  return NextResponse.json(response);
}

/**
 * POST /api/narrative/episodes - Create a new episode
 */
async function handleCreateEpisode(
  request: EnhancedRequest
): Promise<NextResponse> {
  const userId = request.userId!;
  const client = await getClientForAuthType(request) || serviceClient;

  if (!client) {
    return NextResponse.json({ message: 'Database connection not available' }, { status: 503 });
  }

  const body: CreateEpisodeRequest = await request.json();

  // Validation
  if (!body.season_id) {
    return NextResponse.json({ message: 'Season ID is required' }, { status: 400 });
  }

  if (!body.title?.trim()) {
    return NextResponse.json({ message: 'Title is required' }, { status: 400 });
  }

  if (!body.date_range_start || !body.date_range_end) {
    return NextResponse.json({ message: 'Date range is required' }, { status: 400 });
  }

  // Validate dates
  const startDate = new Date(body.date_range_start);
  const endDate = new Date(body.date_range_end);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json({ message: 'Invalid date format' }, { status: 400 });
  }

  if (startDate > endDate) {
    return NextResponse.json({ message: 'Start date must be before or equal to end date' }, { status: 400 });
  }

  // Verify that the season belongs to the user
  const { data: season, error: seasonError } = await client
    .from('seasons')
    .select('id')
    .eq('id', body.season_id)
    .eq('user_id', userId)
    .single();

  if (seasonError || !season) {
    return NextResponse.json({ message: 'Season not found or access denied' }, { status: 404 });
  }

  // Create episode
  const episodeData: any = {
    season_id: body.season_id,
    title: body.title.trim(),
    date_range_start: body.date_range_start,
    date_range_end: body.date_range_end,
    mood_emoji: body.mood_emoji?.trim() || null,
    reflection: body.reflection?.trim() || null,
    metadata: {}
  };

  // Add user_id to payload
  await addUserIdIfNeeded(episodeData, userId, request);

  const { data: episode, error } = await client
    .from('episodes')
    .insert(episodeData)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: 'Failed to create episode' }, { status: 500 });
  }

  return NextResponse.json(episode, { status: 201 });
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetEpisodes, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
  }
});

export const POST = withStandardMiddleware(handleCreateEpisode, {
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
