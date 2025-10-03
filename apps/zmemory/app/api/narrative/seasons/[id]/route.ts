import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabase as serviceClient } from '@/lib/supabase';
import { getClientForAuthType } from '@/auth';
import { z } from 'zod';
import type {
  SeasonWithEpisodes,
  SeasonStatus
} from '../../../../../types/narrative';

export const dynamic = 'force-dynamic';

// Validation schemas
const UpdateSeasonSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').optional(),
  intention: z.string().optional().nullable(),
  theme: z.enum(['spring', 'summer', 'autumn', 'winter']).optional(),
  status: z.enum(['active', 'completed', 'paused']).optional(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  closing_ritual: z.string().optional().nullable()
});

function isValidSeasonStatus(status: string): status is SeasonStatus {
  return ['active', 'completed', 'paused'].includes(status);
}

/**
 * GET /api/narrative/seasons/[id] - Get a specific season by ID
 *
 * Query params: include_episodes (boolean)
 */
async function handleGetSeason(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const userId = request.userId!;
  const client = await getClientForAuthType(request) || serviceClient;

  if (!client) {
    return NextResponse.json({ message: 'Database connection not available' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const includeEpisodes = searchParams.get('include_episodes') === 'true';

  // Get season
  const { data: season, error } = await client
    .from('seasons')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error || !season) {
    return NextResponse.json({ message: 'Season not found' }, { status: 404 });
  }

  if (!includeEpisodes) {
    return NextResponse.json(season);
  }

  // Get episodes for this season
  const { data: episodes, error: episodesError } = await client
    .from('episodes')
    .select('*')
    .eq('season_id', id)
    .eq('user_id', userId)
    .order('date_range_start', { ascending: false });

  if (episodesError) {
    return NextResponse.json({ message: 'Failed to fetch season episodes' }, { status: 500 });
  }

  const seasonWithEpisodes: SeasonWithEpisodes = {
    ...season,
    episodes: episodes || [],
    episode_count: episodes?.length || 0
  };

  return NextResponse.json(seasonWithEpisodes);
}

/**
 * PATCH /api/narrative/seasons/[id] - Update a season
 */
async function handleUpdateSeason(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const userId = request.userId!;
  const body = request.validatedBody!;
  const client = await getClientForAuthType(request) || serviceClient;

  if (!client) {
    return NextResponse.json({ message: 'Database connection not available' }, { status: 503 });
  }

  // First check if season exists and belongs to user
  const { data: existingSeason, error: fetchError } = await client
    .from('seasons')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existingSeason) {
    return NextResponse.json({ message: 'Season not found' }, { status: 404 });
  }

  // If changing to active status, ensure no other active seasons
  if (body.status === 'active' && existingSeason.status !== 'active') {
    const { data: activeSeasons } = await client
      .from('seasons')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .neq('id', id);

    if (activeSeasons && activeSeasons.length > 0) {
      return NextResponse.json(
        { message: 'You can only have one active season at a time' },
        { status: 400 }
      );
    }
  }

  // Build update data
  const updateData: any = {};
  if (body.title !== undefined) updateData.title = body.title.trim();
  if (body.intention !== undefined) updateData.intention = body.intention?.trim() || null;
  if (body.theme) updateData.theme = body.theme;
  if (body.status) updateData.status = body.status;
  if (body.start_date !== undefined) updateData.start_date = body.start_date;
  if (body.end_date !== undefined) updateData.end_date = body.end_date;
  if (body.closing_ritual !== undefined) updateData.closing_ritual = body.closing_ritual;

  // Auto-set end_date when completing a season
  if (body.status === 'completed' && !body.end_date && !existingSeason.end_date) {
    updateData.end_date = new Date().toISOString().split('T')[0];
  }

  const { data: updatedSeason, error } = await client
    .from('seasons')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: 'Failed to update season' }, { status: 500 });
  }

  return NextResponse.json(updatedSeason);
}

/**
 * DELETE /api/narrative/seasons/[id] - Delete a season and all its episodes
 */
async function handleDeleteSeason(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const userId = request.userId!;
  const client = await getClientForAuthType(request) || serviceClient;

  if (!client) {
    return NextResponse.json({ message: 'Database connection not available' }, { status: 503 });
  }

  // First check if season exists and belongs to user
  const { data: existingSeason, error: fetchError } = await client
    .from('seasons')
    .select('id')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existingSeason) {
    return NextResponse.json({ message: 'Season not found' }, { status: 404 });
  }

  // Delete season (episodes will be cascade deleted due to foreign key constraint)
  const { error } = await client
    .from('seasons')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    return NextResponse.json({ message: 'Failed to delete season' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Season deleted successfully' });
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetSeason, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
  }
});

export const PATCH = withStandardMiddleware(handleUpdateSeason, {
  validation: {
    bodySchema: UpdateSeasonSchema
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 50
  }
});

export const DELETE = withStandardMiddleware(handleDeleteSeason, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 20
  }
});

// Explicit OPTIONS handler for CORS preflight
export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
