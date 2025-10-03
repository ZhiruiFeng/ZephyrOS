import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { getClientForAuthType } from '@/auth';
import { generateWeeklyReview } from '@/lib/memory-business-logic';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Query schema for weekly review
const WeeklyReviewQuerySchema = z.object({
  week_offset: z.string().optional().transform(v => parseInt(v || '0')), // 0 = current week, -1 = last week, etc.
  include_emotional_details: z.string().optional().transform(v => v === 'true'),
  include_recommendations: z.string().optional().transform(v => v === 'true'),
  max_highlights: z.string().optional().transform(v => parseInt(v || '10')),
  max_insights: z.string().optional().transform(v => parseInt(v || '5')),
});

/**
 * @swagger
 * /api/memories/reviews/weekly:
 *   get:
 *     summary: Generate weekly memory review
 *     description: Get a comprehensive review of the week's memories including highlights, insights, and emotional summary
 *     tags: [Memory Business Logic, Reviews]
 *     parameters:
 *       - in: query
 *         name: week_offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Week offset (0 = current week, -1 = last week, etc.)
 *       - in: query
 *         name: include_emotional_details
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include emotional summary analysis
 *       - in: query
 *         name: include_recommendations
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include personalized recommendations
 *       - in: query
 *         name: max_highlights
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of highlights to include
 *       - in: query
 *         name: max_insights
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Maximum number of insights to include
 *     responses:
 *       200:
 *         description: Weekly review with highlights, insights, and recommendations
 */
async function handleGetWeeklyReview(
  request: EnhancedRequest
): Promise<NextResponse> {
  const userId = request.userId!;
  const client = await getClientForAuthType(request);

  if (!client) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);

  // Parse and validate query parameters
  const queryResult = WeeklyReviewQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!queryResult.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: queryResult.error.errors },
      { status: 400 }
    );
  }

  const query = queryResult.data;

  // Generate the weekly review
  const reviewData = await generateWeeklyReview(client, userId, query.week_offset);

  // Limit results based on query parameters
  const limitedReviewData: any = {
    ...reviewData,
    highlights: reviewData.highlights.slice(0, query.max_highlights),
    insights: reviewData.insights.slice(0, query.max_insights)
  };

  // Optionally remove emotional details
  if (!query.include_emotional_details) {
    delete limitedReviewData.emotional_summary;
  }

  // Optionally remove recommendations
  if (!query.include_recommendations) {
    delete limitedReviewData.recommendations;
  }

  // Add week context
  const weekStart = new Date(reviewData.period.start);
  const weekEnd = new Date(reviewData.period.end);
  const now = new Date();

  let weekDescription = 'Current week';
  if (query.week_offset === -1) {
    weekDescription = 'Last week';
  } else if (query.week_offset < -1) {
    weekDescription = `${Math.abs(query.week_offset)} weeks ago`;
  } else if (query.week_offset > 0) {
    weekDescription = `${query.week_offset} weeks from now`;
  }

  const response = {
    ...limitedReviewData,
    week_context: {
      description: weekDescription,
      offset: query.week_offset,
      is_current_week: query.week_offset === 0,
      is_complete: weekEnd < now, // Whether the week has fully passed
      formatted_period: `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`
    },
    summary_stats: {
      highlights_count: limitedReviewData.highlights.length,
      insights_count: limitedReviewData.insights.length,
      total_memories: reviewData.emotional_summary.total_memories,
      avg_emotional_intensity: query.include_emotional_details ?
        Math.abs(reviewData.emotional_summary.avg_valence) + reviewData.emotional_summary.avg_arousal / 2 :
        undefined
    },
    generated_at: new Date().toISOString(),
    query_params: query
  };

  return NextResponse.json(response);
}

// Apply middleware with more permissive rate limit for review endpoint
export const GET = withStandardMiddleware(handleGetWeeklyReview, {
  rateLimit: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 20
  }
});

// Explicit OPTIONS handler for CORS preflight
export const OPTIONS = withStandardMiddleware(async () => {
  return new NextResponse(null, { status: 200 });
}, {
  auth: false
});
