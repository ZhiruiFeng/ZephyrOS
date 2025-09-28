import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserIdFromRequest } from '@/auth'
import { jsonWithCors, createOptionsResponse } from '@/lib/security'
import type {
  Season,
  SeasonWithEpisodes,
  UpdateSeasonRequest,
  SeasonStatus
} from '../../../../../types/narrative'

// Server-side Supabase client using service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

// Validation helpers
function isValidSeasonStatus(status: string): status is SeasonStatus {
  return ['active', 'completed', 'paused'].includes(status)
}

// =====================================================
// OPTIONS handler for CORS
// =====================================================
export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request)
}

// =====================================================
// GET /api/narrative/seasons/[id]
// Get a specific season by ID
// =====================================================
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  try {
    if (!supabase) {
      return jsonWithCors(request, { message: 'Database connection not available' }, 503)
    }

    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return jsonWithCors(request, { message: 'Authentication required' }, 401)
    }

    const { searchParams } = new URL(request.url)
    const includeEpisodes = searchParams.get('include_episodes') === 'true'

    // Get season
    const { data: season, error } = await supabase
      .from('seasons')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single()

    if (error || !season) {
      return jsonWithCors(request, { message: 'Season not found' }, 404)
    }

    if (!includeEpisodes) {
      return jsonWithCors(request, season)
    }

    // Get episodes for this season
    const { data: episodes, error: episodesError } = await supabase
      .from('episodes')
      .select('*')
      .eq('season_id', params.id)
      .eq('user_id', userId)
      .order('date_range_start', { ascending: false })

    if (episodesError) {
      console.error('Error fetching episodes:', episodesError)
      return jsonWithCors(request, { message: 'Failed to fetch season episodes' }, 500)
    }

    const seasonWithEpisodes: SeasonWithEpisodes = {
      ...season,
      episodes: episodes || [],
      episode_count: episodes?.length || 0
    }

    return jsonWithCors(request, seasonWithEpisodes)
  } catch (error) {
    console.error('Season GET error:', error)
    return jsonWithCors(request, { message: 'Authentication failed' }, 401)
  }
}

// =====================================================
// PATCH /api/narrative/seasons/[id]
// Update a season
// =====================================================
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  try {
    if (!supabase) {
      return jsonWithCors(request, { message: 'Database connection not available' }, 503)
    }

    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return jsonWithCors(request, { message: 'Authentication required' }, 401)
    }

    const body: UpdateSeasonRequest = await request.json()

    // First check if season exists and belongs to user
    const { data: existingSeason, error: fetchError } = await supabase
      .from('seasons')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single()

    if (fetchError || !existingSeason) {
      return jsonWithCors(request, { message: 'Season not found' }, 404)
    }

    // Validation
    if (body.title !== undefined && !body.title?.trim()) {
      return jsonWithCors(request, { message: 'Title cannot be empty' }, 400)
    }

    if (body.theme && !['spring', 'summer', 'autumn', 'winter'].includes(body.theme)) {
      return jsonWithCors(request, { message: 'Invalid theme' }, 400)
    }

    if (body.status && !isValidSeasonStatus(body.status)) {
      return jsonWithCors(request, { message: 'Invalid status' }, 400)
    }

    // If changing to active status, ensure no other active seasons
    if (body.status === 'active' && existingSeason.status !== 'active') {
      const { data: activeSeasons } = await supabase
        .from('seasons')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .neq('id', params.id)

      if (activeSeasons && activeSeasons.length > 0) {
        return jsonWithCors(request, { message: 'You can only have one active season at a time' }, 400)
      }
    }

    // Build update data
    const updateData: any = {}
    if (body.title !== undefined) updateData.title = body.title.trim()
    if (body.intention !== undefined) updateData.intention = body.intention?.trim() || null
    if (body.theme) updateData.theme = body.theme
    if (body.status) updateData.status = body.status
    if (body.start_date !== undefined) updateData.start_date = body.start_date
    if (body.end_date !== undefined) updateData.end_date = body.end_date
    if (body.closing_ritual) updateData.closing_ritual = body.closing_ritual

    // Auto-set end_date when completing a season
    if (body.status === 'completed' && !body.end_date && !existingSeason.end_date) {
      updateData.end_date = new Date().toISOString().split('T')[0]
    }

    const { data: updatedSeason, error } = await supabase
      .from('seasons')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating season:', error)
      return jsonWithCors(request, { message: 'Failed to update season' }, 500)
    }

    return jsonWithCors(request, updatedSeason)
  } catch (error) {
    console.error('Season PATCH error:', error)
    return jsonWithCors(request, { message: 'Authentication failed' }, 401)
  }
}

// =====================================================
// DELETE /api/narrative/seasons/[id]
// Delete a season and all its episodes
// =====================================================
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  try {
    if (!supabase) {
      return jsonWithCors(request, { message: 'Database connection not available' }, 503)
    }

    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return jsonWithCors(request, { message: 'Authentication required' }, 401)
    }

    // First check if season exists and belongs to user
    const { data: existingSeason, error: fetchError } = await supabase
      .from('seasons')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single()

    if (fetchError || !existingSeason) {
      return jsonWithCors(request, { message: 'Season not found' }, 404)
    }

    // Delete season (episodes will be cascade deleted due to foreign key constraint)
    const { error } = await supabase
      .from('seasons')
      .delete()
      .eq('id', params.id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting season:', error)
      return jsonWithCors(request, { message: 'Failed to delete season' }, 500)
    }

    return jsonWithCors(request, { message: 'Season deleted successfully' })
  } catch (error) {
    console.error('Season DELETE error:', error)
    return jsonWithCors(request, { message: 'Authentication failed' }, 401)
  }
}