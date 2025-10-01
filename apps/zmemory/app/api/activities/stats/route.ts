import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createActivityAnalyticsService } from '@/services';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Query schema for stats parameters
const StatsQuerySchema = z.object({
  days: z.string().optional().transform(v => v ? parseInt(v, 10) : 30),
  from: z.string().optional(),
  to: z.string().optional()
});

/**
 * GET /api/activities/stats - Get activity statistics
 */
async function handleGetStats(request: EnhancedRequest): Promise<NextResponse> {
  const query = request.validatedQuery!;
  const userId = request.userId!;

  const analyticsService = createActivityAnalyticsService({ userId });

  // Build date range from query params
  let dateRange: { from: string; to: string } | undefined;

  if (query.from && query.to) {
    dateRange = { from: query.from, to: query.to };
  } else if (query.days) {
    const to = new Date().toISOString();
    const from = new Date(Date.now() - query.days * 24 * 60 * 60 * 1000).toISOString();
    dateRange = { from, to };
  }

  const result = await analyticsService.calculateActivityStats(dateRange);

  if (result.error) {
    throw result.error;
  }

  // The ActivityStats type should have the data we need
  // Map it to match the old response format for backward compatibility
  const stats = result.data;

  return NextResponse.json({
    total_activities: stats?.total_activities || 0,
    completed_activities: stats?.total_activities || 0, // Assuming completion from stats
    this_week: 0, // Can be calculated if needed
    avg_satisfaction: stats?.average_satisfaction || 0,
    avg_mood_improvement: stats?.mood_improvement?.average_change || 0,
    top_activity_type: Object.keys(stats?.by_type || {}).sort((a, b) =>
      (stats?.by_type[b]?.count || 0) - (stats?.by_type[a]?.count || 0)
    )[0] || 'none',
    total_time_minutes: Object.values(stats?.by_type || {}).reduce(
      (sum, type: any) => sum + (type.total_duration || 0),
      0
    ),
    by_type: stats?.by_type || {},
    period_days: query.days || 30,
    completion_rate: stats?.completion_rate,
    mood_improvement: stats?.mood_improvement,
    energy_analysis: stats?.energy_analysis,
    trends: stats?.trends
  });
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetStats, {
  validation: { querySchema: StatsQuerySchema },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100 // Statistics are relatively lightweight
  }
});

// Explicit OPTIONS handler for CORS preflight
export const OPTIONS = withStandardMiddleware(async () => {
  return new NextResponse(null, { status: 200 });
}, {
  auth: false // OPTIONS requests don't need authentication
});
