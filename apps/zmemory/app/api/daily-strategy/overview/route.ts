import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { getClientForAuthType } from '@/auth';
import { z } from 'zod';
import { DailyStrategyOverview } from '@/lib/daily-strategy-types';

export const dynamic = 'force-dynamic';

// Query schema for overview endpoint
const OverviewQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD format
  timezone: z.string().default('America/Los_Angeles'),
});

/**
 * @swagger
 * /api/daily-strategy/overview:
 *   get:
 *     summary: Get daily strategy overview
 *     description: Retrieve comprehensive daily strategy overview including priorities, planning, reflections, and adventures for a specific date
 *     tags: [Daily Strategy]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *         description: Date to get overview for (defaults to today in specified timezone)
 *       - in: query
 *         name: timezone
 *         schema:
 *           type: string
 *           default: 'America/Los_Angeles'
 *         description: Timezone for date interpretation
 *     responses:
 *       200:
 *         description: Daily strategy overview
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 date:
 *                   type: string
 *                   description: Date of the overview (YYYY-MM-DD)
 *                 timezone:
 *                   type: string
 *                   description: Timezone used
 *                 priorities:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DailyStrategyItem'
 *                 planning_items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DailyStrategyItem'
 *                 reflections:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DailyStrategyItem'
 *                 adventures:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DailyStrategyItem'
 *                 energy_summary:
 *                   type: object
 *                   properties:
 *                     total_planned_energy:
 *                       type: number
 *                     total_used_energy:
 *                       type: number
 *                     energy_efficiency:
 *                       type: number
 *                       nullable: true
 *                 completion_stats:
 *                   type: object
 *                   properties:
 *                     total_items:
 *                       type: integer
 *                     completed_items:
 *                       type: integer
 *                     in_progress_items:
 *                       type: integer
 *                     deferred_items:
 *                       type: integer
 *                     completion_rate:
 *                       type: number
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
async function handleGetDailyStrategyOverview(
  request: EnhancedRequest
): Promise<NextResponse> {
  const userId = request.userId!;
  const { searchParams } = new URL(request.url);

  const queryResult = OverviewQuerySchema.safeParse(Object.fromEntries(searchParams));

  if (!queryResult.success) {
    return NextResponse.json({
      error: 'Invalid query parameters',
      details: queryResult.error.errors
    }, { status: 400 });
  }

  const query = queryResult.data;

  const client = await getClientForAuthType(request);
  if (!client) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // Use current date if not provided
  const targetDate = query.date || new Date().toISOString().split('T')[0];
  const targetTimezone = query.timezone;

  // Use the database function to get the overview
  const { data: overviewData, error: overviewError } = await client
    .rpc('get_daily_strategy_overview', {
      user_uuid: userId,
      target_date: targetDate,
      target_tz: targetTimezone
    });

  if (overviewError) {
    console.error('Daily strategy overview error:', overviewError);
    return NextResponse.json({ error: 'Failed to fetch daily strategy overview' }, { status: 500 });
  }

  // If the function returns null or no data, create an empty overview
  if (!overviewData) {
    const emptyOverview: DailyStrategyOverview = {
      date: targetDate,
      timezone: targetTimezone,
      priorities: [],
      planning_items: [],
      reflections: [],
      adventures: [],
      energy_summary: {
        total_planned_energy: 0,
        total_used_energy: 0,
        energy_efficiency: undefined
      },
      completion_stats: {
        total_items: 0,
        completed_items: 0,
        in_progress_items: 0,
        deferred_items: 0,
        completion_rate: 0
      }
    };
    return NextResponse.json(emptyOverview);
  }

  // Parse the JSON response from the database function
  const overview = typeof overviewData === 'string' ? JSON.parse(overviewData) : overviewData;

  // Ensure all arrays exist (database function might return null for empty arrays)
  const normalizedOverview: DailyStrategyOverview = {
    date: targetDate,
    timezone: targetTimezone,
    priorities: overview.priorities || [],
    planning_items: overview.planning_items || [],
    reflections: overview.reflections || [],
    adventures: overview.adventures || [],
    energy_summary: overview.energy_summary || {
      total_planned_energy: 0,
      total_used_energy: 0,
      energy_efficiency: undefined
    },
    completion_stats: overview.completion_stats || {
      total_items: 0,
      completed_items: 0,
      in_progress_items: 0,
      deferred_items: 0,
      completion_rate: 0
    }
  };

  return NextResponse.json(normalizedOverview);
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetDailyStrategyOverview, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 300
  }
});

// Explicit OPTIONS handler for CORS preflight
export const OPTIONS = withStandardMiddleware(async () => {
  return new NextResponse(null, { status: 200 });
}, {
  auth: false
});
