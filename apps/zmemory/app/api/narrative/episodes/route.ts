import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserIdFromRequest } from '@/auth'
import { jsonWithCors, createOptionsResponse } from '@/lib/security'
import type {
  Episode,
  CreateEpisodeRequest,
  EpisodesResponse
} from '../../../../types/narrative'

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
// GET /api/narrative/episodes
// Get episodes for the authenticated user
// =====================================================
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return jsonWithCors(request, { message: 'Database connection not available' }, 503)
    }

    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return jsonWithCors(request, { message: 'Authentication required' }, 401)
    }

    const { searchParams } = new URL(request.url)

    const seasonId = searchParams.get('season_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    // Build query
    let query = supabase
      .from('episodes')
      .select('*')
      .eq('user_id', userId)
      .order('date_range_start', { ascending: false })
      .range(offset, offset + limit - 1)

    // Add filters
    if (seasonId) {
      query = query.eq('season_id', seasonId)
    }

    if (dateFrom) {
      query = query.gte('date_range_end', dateFrom)
    }

    if (dateTo) {
      query = query.lte('date_range_start', dateTo)
    }

    const { data: episodes, error, count } = await query

    if (error) {
      console.error('Error fetching episodes:', error)
      return jsonWithCors(request, { message: 'Failed to fetch episodes' }, 500)
    }

    const response: EpisodesResponse = {
      episodes: episodes || [],
      total: count || 0,
      has_more: (count || 0) > offset + limit
    }

    return jsonWithCors(request, response)
  } catch (error) {
    console.error('Episodes GET error:', error)
    return jsonWithCors(request, { message: 'Authentication failed' }, 401)
  }
}

// =====================================================
// POST /api/narrative/episodes
// Create a new episode
// =====================================================
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return jsonWithCors(request, { message: 'Database connection not available' }, 503)
    }

    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return jsonWithCors(request, { message: 'Authentication required' }, 401)
    }

    const body: CreateEpisodeRequest = await request.json()

    // Validation
    if (!body.season_id) {
      return jsonWithCors(request, { message: 'Season ID is required' }, 400)
    }

    if (!body.title?.trim()) {
      return jsonWithCors(request, { message: 'Title is required' }, 400)
    }

    if (!body.date_range_start || !body.date_range_end) {
      return jsonWithCors(request, { message: 'Date range is required' }, 400)
    }

    // Validate dates
    const startDate = new Date(body.date_range_start)
    const endDate = new Date(body.date_range_end)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return jsonWithCors(request, { message: 'Invalid date format' }, 400)
    }

    if (startDate > endDate) {
      return jsonWithCors(request, { message: 'Start date must be before or equal to end date' }, 400)
    }

    // Verify that the season belongs to the user
    const { data: season, error: seasonError } = await supabase
      .from('seasons')
      .select('id')
      .eq('id', body.season_id)
      .eq('user_id', userId)
      .single()

    if (seasonError || !season) {
      return jsonWithCors(request, { message: 'Season not found or access denied' }, 404)
    }

    // Create episode
    const episodeData = {
      season_id: body.season_id,
      user_id: userId,
      title: body.title.trim(),
      date_range_start: body.date_range_start,
      date_range_end: body.date_range_end,
      mood_emoji: body.mood_emoji?.trim() || null,
      reflection: body.reflection?.trim() || null,
      metadata: {}
    }

    const { data: episode, error } = await supabase
      .from('episodes')
      .insert(episodeData)
      .select()
      .single()

    if (error) {
      console.error('Error creating episode:', error)
      return jsonWithCors(request, { message: 'Failed to create episode' }, 500)
    }

    return jsonWithCors(request, episode, 201)
  } catch (error) {
    console.error('Episodes POST error:', error)
    return jsonWithCors(request, { message: 'Authentication failed' }, 401)
  }
}