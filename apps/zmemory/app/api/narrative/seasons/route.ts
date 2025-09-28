import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserIdFromRequest } from '@/auth'
import { jsonWithCors, createOptionsResponse } from '@/lib/security'
import type {
  Season,
  CreateSeasonRequest,
  SeasonsResponse,
  SeasonTheme,
  SeasonStatus
} from '../../../../types/narrative'

// Server-side Supabase client using service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

// Validation helpers
function isValidSeasonTheme(theme: string): theme is SeasonTheme {
  return ['spring', 'summer', 'autumn', 'winter'].includes(theme)
}

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
// GET /api/narrative/seasons
// Get all seasons for the authenticated user
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

    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('seasons')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Add status filter if provided
    if (status && isValidSeasonStatus(status)) {
      query = query.eq('status', status)
    }

    const { data: seasons, error, count } = await query

    if (error) {
      console.error('Error fetching seasons:', error)
      return jsonWithCors(request, { message: 'Failed to fetch seasons' }, 500)
    }

    const response: SeasonsResponse = {
      seasons: seasons || [],
      total: count || 0,
      has_more: (count || 0) > offset + limit
    }

    return jsonWithCors(request, response)
  } catch (error) {
    console.error('Seasons GET error:', error)
    return jsonWithCors(request, { message: 'Authentication failed' }, 401)
  }
}

// =====================================================
// POST /api/narrative/seasons
// Create a new season
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

    const body: CreateSeasonRequest = await request.json()

    // Validation
    if (!body.title?.trim()) {
      return jsonWithCors(request, { message: 'Title is required' }, 400)
    }

    if (!body.theme || !isValidSeasonTheme(body.theme)) {
      return jsonWithCors(request, { message: 'Valid theme is required (spring, summer, autumn, winter)' }, 400)
    }

    // Check if user is trying to create multiple active seasons
    if (!body.start_date) {
      const { data: activeSeasons } = await supabase
        .from('seasons')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')

      if (activeSeasons && activeSeasons.length > 0) {
        return jsonWithCors(request, { message: 'You can only have one active season at a time. Please complete or pause your current season first.' }, 400)
      }
    }

    // Create season
    const seasonData = {
      user_id: userId,
      title: body.title.trim(),
      intention: body.intention?.trim() || null,
      theme: body.theme,
      start_date: body.start_date || new Date().toISOString().split('T')[0],
      opening_ritual: body.opening_ritual || {},
      status: 'active' as const,
      metadata: {}
    }

    const { data: season, error } = await supabase
      .from('seasons')
      .insert(seasonData)
      .select()
      .single()

    if (error) {
      console.error('Error creating season:', error)
      return jsonWithCors(request, { message: 'Failed to create season' }, 500)
    }

    return jsonWithCors(request, season, 201)
  } catch (error) {
    console.error('Seasons POST error:', error)
    return jsonWithCors(request, { message: 'Authentication failed' }, 401)
  }
}