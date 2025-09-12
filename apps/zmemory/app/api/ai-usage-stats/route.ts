import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserIdFromRequest } from '../../../lib/auth'

// Helper function to add CORS headers to responses
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

// Create Supabase client for service operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null

// GET /api/ai-usage-stats - Get AI usage statistics
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
    const days = parseInt(searchParams.get('days') || '30')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')

    // Build date range
    let dateFilter = `date >= '${new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}'`
    if (start_date && end_date) {
      dateFilter = `date >= '${start_date}' AND date <= '${end_date}'`
    }

    // Get usage statistics
    const { data: stats, error } = await supabase
      .from('ai_usage_stats')
      .select('*')
      .eq('user_id', userId)
      .gte('date', start_date || new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .lte('date', end_date || new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (error) {
      console.error('Error fetching usage stats:', error)
      return addCorsHeaders(NextResponse.json({ error: 'Failed to fetch usage statistics' }, { status: 500 }))
    }

    // Get agent summary statistics
    const { data: agentStats, error: agentError } = await supabase
      .from('agent_summary')
      .select('*')
      .eq('user_id', userId)
      .order('activity_score', { ascending: false })

    if (agentError) {
      console.error('Error fetching agent stats:', agentError)
      return addCorsHeaders(NextResponse.json({ error: 'Failed to fetch agent statistics' }, { status: 500 }))
    }

    // Calculate summary metrics (including cost tracking)
    const totalInteractions = stats?.reduce((sum, stat) => sum + stat.total_interactions, 0) || 0
    const totalDuration = stats?.reduce((sum, stat) => sum + stat.total_duration_minutes, 0) || 0
    const totalCost = stats?.reduce((sum, stat) => sum + (stat.total_cost || 0), 0) || 0
    const totalInputTokens = stats?.reduce((sum, stat) => sum + (stat.total_input_tokens || 0), 0) || 0
    const totalOutputTokens = stats?.reduce((sum, stat) => sum + (stat.total_output_tokens || 0), 0) || 0
    const uniqueAgents = agentStats?.length || 0
    const activeAgents = agentStats?.filter(agent => agent.is_active).length || 0

    // Get feature usage breakdown
    const featureUsage: Record<string, number> = {}
    const vendorUsage: Record<string, number> = {}

    stats?.forEach(stat => {
      if (stat.feature_usage) {
        Object.entries(stat.feature_usage).forEach(([feature, count]) => {
          featureUsage[feature] = (featureUsage[feature] || 0) + (count as number)
        })
      }
      if (stat.vendor_usage) {
        Object.entries(stat.vendor_usage).forEach(([vendor, count]) => {
          vendorUsage[vendor] = (vendorUsage[vendor] || 0) + (count as number)
        })
      }
    })

    // Calculate average satisfaction and usefulness
    const avgSatisfaction = stats?.length > 0 
      ? stats.reduce((sum, stat) => sum + (stat.avg_satisfaction || 0), 0) / stats.length 
      : 0
    const avgUsefulness = stats?.length > 0 
      ? stats.reduce((sum, stat) => sum + (stat.avg_usefulness || 0), 0) / stats.length 
      : 0

    return addCorsHeaders(NextResponse.json({
      summary: {
        total_interactions: totalInteractions,
        total_duration_minutes: totalDuration,
        total_cost: Math.round(totalCost * 10000) / 10000, // Round to 4 decimal places
        total_input_tokens: totalInputTokens,
        total_output_tokens: totalOutputTokens,
        unique_agents: uniqueAgents,
        active_agents: activeAgents,
        avg_satisfaction: Math.round(avgSatisfaction * 100) / 100,
        avg_usefulness: Math.round(avgUsefulness * 100) / 100
      },
      daily_stats: stats,
      agent_stats: agentStats,
      feature_usage: featureUsage,
      vendor_usage: vendorUsage
    }))
  } catch (error) {
    console.error('Unexpected error:', error)
    return addCorsHeaders(NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

// POST /api/ai-usage-stats - Update daily usage statistics
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return addCorsHeaders(NextResponse.json({ error: 'Database not configured' }, { status: 500 }))
    }

    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return addCorsHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const body = await request.json()
    const { date } = body

    // Default to today if no date provided
    const targetDate = date || new Date().toISOString().split('T')[0]

    // Call the database function to update usage stats
    const { data, error } = await supabase.rpc('update_daily_usage_stats', {
      target_date: targetDate
    })

    if (error) {
      console.error('Error updating usage stats:', error)
      return addCorsHeaders(NextResponse.json({ error: 'Failed to update usage statistics' }, { status: 500 }))
    }

    return addCorsHeaders(NextResponse.json({ success: true, data }))
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
