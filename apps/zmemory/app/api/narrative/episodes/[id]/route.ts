import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserIdFromRequest } from '@/auth'
import { jsonWithCors, createOptionsResponse } from '@/lib/security'
import type {
  Episode,
  UpdateEpisodeRequest
} from '../../../../../types/narrative'

// Server-side Supabase client using service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

// =====================================================
// OPTIONS handler for CORS
// =====================================================
export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request)
}

// =====================================================
// GET /api/narrative/episodes/[id]
// Get a specific episode by ID
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

    const { data: episode, error } = await supabase
      .from('episodes')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single()

    if (error || !episode) {
      return jsonWithCors(request, { message: 'Episode not found' }, 404)
    }

    return jsonWithCors(request, episode)
  } catch (error) {
    console.error('Episode GET error:', error)
    return jsonWithCors(request, { message: 'Authentication failed' }, 401)
  }
}

// =====================================================
// PATCH /api/narrative/episodes/[id]
// Update an episode
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

    const body: UpdateEpisodeRequest = await request.json()

    // First check if episode exists and belongs to user
    const { data: existingEpisode, error: fetchError } = await supabase
      .from('episodes')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single()

    if (fetchError || !existingEpisode) {
      return jsonWithCors(request, { message: 'Episode not found' }, 404)
    }

    // Validation
    if (body.title !== undefined && !body.title?.trim()) {
      return jsonWithCors(request, { message: 'Title cannot be empty' }, 400)
    }

    // Validate dates if provided
    if (body.date_range_start || body.date_range_end) {
      const startDate = new Date(body.date_range_start || existingEpisode.date_range_start)
      const endDate = new Date(body.date_range_end || existingEpisode.date_range_end)

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return jsonWithCors(request, { message: 'Invalid date format' }, 400)
      }

      if (startDate > endDate) {
        return jsonWithCors(request, { message: 'Start date must be before or equal to end date' }, 400)
      }
    }

    // Build update data
    const updateData: any = {}
    if (body.title !== undefined) updateData.title = body.title.trim()
    if (body.date_range_start !== undefined) updateData.date_range_start = body.date_range_start
    if (body.date_range_end !== undefined) updateData.date_range_end = body.date_range_end
    if (body.mood_emoji !== undefined) updateData.mood_emoji = body.mood_emoji?.trim() || null
    if (body.reflection !== undefined) updateData.reflection = body.reflection?.trim() || null

    const { data: updatedEpisode, error } = await supabase
      .from('episodes')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating episode:', error)
      return jsonWithCors(request, { message: 'Failed to update episode' }, 500)
    }

    return jsonWithCors(request, updatedEpisode)
  } catch (error) {
    console.error('Episode PATCH error:', error)
    return jsonWithCors(request, { message: 'Authentication failed' }, 401)
  }
}

// =====================================================
// DELETE /api/narrative/episodes/[id]
// Delete an episode
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

    // First check if episode exists and belongs to user
    const { data: existingEpisode, error: fetchError } = await supabase
      .from('episodes')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single()

    if (fetchError || !existingEpisode) {
      return jsonWithCors(request, { message: 'Episode not found' }, 404)
    }

    // Delete episode
    const { error } = await supabase
      .from('episodes')
      .delete()
      .eq('id', params.id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting episode:', error)
      return jsonWithCors(request, { message: 'Failed to delete episode' }, 500)
    }

    return jsonWithCors(request, { message: 'Episode deleted successfully' })
  } catch (error) {
    console.error('Episode DELETE error:', error)
    return jsonWithCors(request, { message: 'Authentication failed' }, 401)
  }
}