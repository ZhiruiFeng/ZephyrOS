import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserIdFromRequest } from '../../../lib/auth'

// Helper function to add CORS headers to responses
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

// Create Supabase client for service operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null

// GET /api/interaction-types - Get all available interaction types
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return addCorsHeaders(NextResponse.json({ error: 'Database not configured' }, { status: 500 }))
    }

    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return addCorsHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const is_active = searchParams.get('is_active')

    let query = supabase
      .from('interaction_types')
      .select('*')
      .order('sort_order')
      .order('name')

    // Apply filters
    if (category) {
      query = query.eq('category', category)
    }

    if (is_active !== null) {
      query = query.eq('is_active', is_active === 'true')
    } else {
      // Default to active types only
      query = query.eq('is_active', true)
    }

    const { data: types, error } = await query

    if (error) {
      console.error('Error fetching interaction types:', error)
      return addCorsHeaders(NextResponse.json({ error: 'Failed to fetch interaction types' }, { status: 500 }))
    }

    // Group by category for easier UI consumption
    const group_by_category = searchParams.get('group_by_category') === 'true'

    if (group_by_category && types) {
      const grouped = types.reduce((acc: Record<string, any[]>, type) => {
        const cat = type.category || 'other'
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(type)
        return acc
      }, {})
      
      return addCorsHeaders(NextResponse.json({ types: grouped, categories: Object.keys(grouped) }))
    }

    return addCorsHeaders(NextResponse.json({ types }))
  } catch (error) {
    console.error('Unexpected error:', error)
    return addCorsHeaders(NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

// OPTIONS - Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}