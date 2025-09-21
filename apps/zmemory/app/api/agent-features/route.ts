import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserIdFromRequest } from '../../../lib/auth'
import { jsonWithCors, createOptionsResponse } from '../../../lib/security'

// Create Supabase client for service operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null

// GET /api/agent-features - Get all available agent features
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return jsonWithCors(request, { error: 'Database not configured' }, 500)
    }

    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401)
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const is_active = searchParams.get('is_active')

    let query = supabase
      .from('agent_features')
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
      // Default to active features only
      query = query.eq('is_active', true)
    }

    const { data: features, error } = await query

    if (error) {
      console.error('Error fetching agent features:', error)
      return jsonWithCors(request, { error: 'Failed to fetch features' }, 500)
    }

    // Group by category for easier UI consumption
    const { searchParams: sp } = new URL(request.url)
    const group_by_category = sp.get('group_by_category') === 'true'

    if (group_by_category && features) {
      const grouped = features.reduce((acc: Record<string, any[]>, feature) => {
        const cat = feature.category || 'other'
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(feature)
        return acc
      }, {})
      
      return jsonWithCors(request, { features: grouped, categories: Object.keys(grouped) })
    }

    return jsonWithCors(request, { features })
  } catch (error) {
    console.error('Unexpected error:', error)
    return jsonWithCors(request, { error: 'Internal server error' }, 500)
  }
}

// OPTIONS - Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request)
}