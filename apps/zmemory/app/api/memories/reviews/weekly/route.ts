import { NextRequest, NextResponse } from 'next/server';
import { createClientForRequest, getUserIdFromRequest } from '../../../../../lib/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '../../../../../lib/security';
import { generateWeeklyReview } from '../../../../../lib/memory-business-logic';
import { z } from 'zod';

// Query schema for weekly review
const WeeklyReviewQuerySchema = z.object({
  week_offset: z.string().optional().transform(v => parseInt(v || '0')), // 0 = current week, -1 = last week, etc.
  include_emotional_details: z.string().optional().transform(v => v === 'true').default(true),
  include_recommendations: z.string().optional().transform(v => v === 'true').default(true),
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
export async function GET(request: NextRequest) {
  try {
    // Rate limiting - more permissive for review endpoint
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 10 * 60 * 1000, 20)) { // 20 requests per 10 minutes
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = createClientForRequest(request);
    if (!client) {
      return jsonWithCors(request, { error: 'Supabase not configured' }, 500);
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

    console.log('=== WEEKLY REVIEW API DEBUG ===');
    console.log('Query params:', JSON.stringify(query, null, 2));
    console.log('Week offset:', query.week_offset);

    // Generate the weekly review
    const reviewData = await generateWeeklyReview(client, userId, query.week_offset);

    // Limit results based on query parameters
    const limitedReviewData = {
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

    console.log(`Generated weekly review for week ${query.week_offset}: ${response.summary_stats.highlights_count} highlights, ${response.summary_stats.insights_count} insights`);

    return jsonWithCors(request, response);

  } catch (error) {
    console.error('Weekly review API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}