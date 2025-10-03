import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabase as serviceClient } from '@/lib/config/supabase';
import { getClientForAuthType } from '@/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ai-usage-stats - Get AI usage statistics
 *
 * Query params: days (default 30), start_date, end_date
 */
async function handleGetUsageStats(
  request: EnhancedRequest
): Promise<NextResponse> {
  const userId = request.userId!;
  const client = await getClientForAuthType(request) || serviceClient;

  if (!client) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30');
  const start_date = searchParams.get('start_date');
  const end_date = searchParams.get('end_date');

  // Build date range
  const startDate = start_date || new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = end_date || new Date().toISOString().split('T')[0];

  // Get usage statistics
  const { data: stats, error } = await client
    .from('ai_usage_stats')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch usage statistics' }, { status: 500 });
  }

  // Get agent summary statistics
  const { data: agentStats, error: agentError } = await client
    .from('agent_summary')
    .select('*')
    .eq('user_id', userId)
    .order('activity_score', { ascending: false });

  if (agentError) {
    return NextResponse.json({ error: 'Failed to fetch agent statistics' }, { status: 500 });
  }

  // Calculate summary metrics
  const totalInteractions = stats?.reduce((sum, stat) => sum + stat.total_interactions, 0) || 0;
  const totalDuration = stats?.reduce((sum, stat) => sum + stat.total_duration_minutes, 0) || 0;
  const totalCost = stats?.reduce((sum, stat) => sum + (stat.total_cost || 0), 0) || 0;
  const totalInputTokens = stats?.reduce((sum, stat) => sum + (stat.total_input_tokens || 0), 0) || 0;
  const totalOutputTokens = stats?.reduce((sum, stat) => sum + (stat.total_output_tokens || 0), 0) || 0;
  const uniqueAgents = agentStats?.length || 0;
  const activeAgents = agentStats?.filter(agent => agent.is_active).length || 0;

  // Get feature usage breakdown
  const featureUsage: Record<string, number> = {};
  const vendorUsage: Record<string, number> = {};

  stats?.forEach(stat => {
    if (stat.feature_usage) {
      Object.entries(stat.feature_usage).forEach(([feature, count]) => {
        featureUsage[feature] = (featureUsage[feature] || 0) + (count as number);
      });
    }
    if (stat.vendor_usage) {
      Object.entries(stat.vendor_usage).forEach(([vendor, count]) => {
        vendorUsage[vendor] = (vendorUsage[vendor] || 0) + (count as number);
      });
    }
  });

  // Calculate average satisfaction and usefulness
  const avgSatisfaction = stats?.length > 0
    ? stats.reduce((sum, stat) => sum + (stat.avg_satisfaction || 0), 0) / stats.length
    : 0;
  const avgUsefulness = stats?.length > 0
    ? stats.reduce((sum, stat) => sum + (stat.avg_usefulness || 0), 0) / stats.length
    : 0;

  return NextResponse.json({
    summary: {
      total_interactions: totalInteractions,
      total_duration_minutes: totalDuration,
      total_cost: Math.round(totalCost * 10000) / 10000,
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
  });
}

/**
 * POST /api/ai-usage-stats - Update daily usage statistics
 */
async function handleUpdateUsageStats(
  request: EnhancedRequest
): Promise<NextResponse> {
  const userId = request.userId!;
  const client = await getClientForAuthType(request) || serviceClient;

  if (!client) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { date } = body;

  // Default to today if no date provided
  const targetDate = date || new Date().toISOString().split('T')[0];

  // Call the database function to update usage stats
  const { data, error } = await client.rpc('update_daily_usage_stats', {
    target_date: targetDate
  });

  if (error) {
    return NextResponse.json({ error: 'Failed to update usage statistics' }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetUsageStats, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
  }
});

export const POST = withStandardMiddleware(handleUpdateUsageStats, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 50
  }
});

// Explicit OPTIONS handler for CORS preflight
export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
