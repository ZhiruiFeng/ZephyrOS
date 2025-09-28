import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserIdFromRequest } from '@/auth'
import { jsonWithCors, createOptionsResponse } from '@/lib/security'
import type { Season } from '../../../../../types/narrative'

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
// GET /api/narrative/seasons/current
// Get the current active season for the user
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

    const { data: season, error } = await supabase
      .from('seasons')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error fetching current season:', error)
      return jsonWithCors(request, { message: 'Failed to fetch current season' }, 500)
    }

    if (!season) {
      return jsonWithCors(request, { message: 'No active season found' }, 404)
    }

    return jsonWithCors(request, season)
  } catch (error) {
    console.error('Current season GET error:', error)
    return jsonWithCors(request, { message: 'Authentication failed' }, 401)
  }
}