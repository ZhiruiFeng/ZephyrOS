import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabase as serviceClient } from '@/lib/supabase';
import { getClientForAuthType } from '@/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Validation schema
const UpdateEpisodeSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').optional(),
  date_range_start: z.string().optional(),
  date_range_end: z.string().optional(),
  mood_emoji: z.string().optional().nullable(),
  reflection: z.string().optional().nullable()
}).refine(
  (data) => {
    // If both dates are provided, validate that start <= end
    if (data.date_range_start && data.date_range_end) {
      const startDate = new Date(data.date_range_start);
      const endDate = new Date(data.date_range_end);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return false;
      }

      return startDate <= endDate;
    }
    return true;
  },
  {
    message: 'Start date must be before or equal to end date'
  }
);

/**
 * GET /api/narrative/episodes/[id] - Get a specific episode by ID
 */
async function handleGetEpisode(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const userId = request.userId!;
  const client = await getClientForAuthType(request) || serviceClient;

  if (!client) {
    return NextResponse.json({ message: 'Database connection not available' }, { status: 503 });
  }

  const { data: episode, error } = await client
    .from('episodes')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error || !episode) {
    return NextResponse.json({ message: 'Episode not found' }, { status: 404 });
  }

  return NextResponse.json(episode);
}

/**
 * PATCH /api/narrative/episodes/[id] - Update an episode
 */
async function handleUpdateEpisode(
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

  // First check if episode exists and belongs to user
  const { data: existingEpisode, error: fetchError } = await client
    .from('episodes')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existingEpisode) {
    return NextResponse.json({ message: 'Episode not found' }, { status: 404 });
  }

  // Validate dates if only one is provided
  if (body.date_range_start || body.date_range_end) {
    const startDate = new Date(body.date_range_start || existingEpisode.date_range_start);
    const endDate = new Date(body.date_range_end || existingEpisode.date_range_end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ message: 'Invalid date format' }, { status: 400 });
    }

    if (startDate > endDate) {
      return NextResponse.json(
        { message: 'Start date must be before or equal to end date' },
        { status: 400 }
      );
    }
  }

  // Build update data
  const updateData: any = {};
  if (body.title !== undefined) updateData.title = body.title.trim();
  if (body.date_range_start !== undefined) updateData.date_range_start = body.date_range_start;
  if (body.date_range_end !== undefined) updateData.date_range_end = body.date_range_end;
  if (body.mood_emoji !== undefined) updateData.mood_emoji = body.mood_emoji?.trim() || null;
  if (body.reflection !== undefined) updateData.reflection = body.reflection?.trim() || null;

  const { data: updatedEpisode, error } = await client
    .from('episodes')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: 'Failed to update episode' }, { status: 500 });
  }

  return NextResponse.json(updatedEpisode);
}

/**
 * DELETE /api/narrative/episodes/[id] - Delete an episode
 */
async function handleDeleteEpisode(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const userId = request.userId!;
  const client = await getClientForAuthType(request) || serviceClient;

  if (!client) {
    return NextResponse.json({ message: 'Database connection not available' }, { status: 503 });
  }

  // First check if episode exists and belongs to user
  const { data: existingEpisode, error: fetchError } = await client
    .from('episodes')
    .select('id')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existingEpisode) {
    return NextResponse.json({ message: 'Episode not found' }, { status: 404 });
  }

  // Delete episode
  const { error } = await client
    .from('episodes')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    return NextResponse.json({ message: 'Failed to delete episode' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Episode deleted successfully' });
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetEpisode, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
  }
});

export const PATCH = withStandardMiddleware(handleUpdateEpisode, {
  validation: {
    bodySchema: UpdateEpisodeSchema
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 50
  }
});

export const DELETE = withStandardMiddleware(handleDeleteEpisode, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 20
  }
});

// Explicit OPTIONS handler for CORS preflight
export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
