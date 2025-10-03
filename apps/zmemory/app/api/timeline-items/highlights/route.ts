import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabaseServer } from '@/lib/supabase-server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const HighlightsQuerySchema = z.object({
  period: z.enum(['week', 'month', 'quarter', 'year', 'custom']).default('week'),
  from_date: z.string().datetime({ offset: true }).optional(),
  to_date: z.string().datetime({ offset: true }).optional(),
  min_salience: z.string().optional().transform(v => v ? parseFloat(v) : 0.7),
  include_manual_highlights: z.string().optional().transform(v => v === 'true'),
  limit: z.string().optional().transform(v => parseInt(v || '50')),
  offset: z.string().optional().transform(v => parseInt(v || '0')),
  memory_type: z.enum(['note', 'link', 'file', 'thought', 'quote', 'insight']).optional(),
  importance_level: z.enum(['low', 'medium', 'high']).optional(),
  sort_by: z.enum(['salience_score', 'captured_at', 'emotion_valence']).default('salience_score'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * @swagger
 * /api/timeline-items/highlights:
 *   get:
 *     summary: Get highlight memories for review
 *     description: Retrieve the most salient and meaningful memories for weekly/monthly reviews
 *     tags: [Timeline Items, Memory Highlights]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year, custom]
 *           default: week
 *       - in: query
 *         name: min_salience
 *         schema:
 *           type: number
 *           default: 0.7
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: List of highlight memories
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
async function handleGetHighlights(
  request: EnhancedRequest
): Promise<NextResponse> {
  const userId = request.userId!;
  const { searchParams } = new URL(request.url);

  const queryResult = HighlightsQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!queryResult.success) {
    return NextResponse.json({
      error: 'Invalid query parameters',
      details: queryResult.error.errors
    }, { status: 400 });
  }

  const query = queryResult.data;

  if (!supabaseServer) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // Calculate date range based on period
  const now = new Date();
  let fromDate: string, toDate: string;

  if (query.period === 'custom') {
    if (!query.from_date || !query.to_date) {
      return NextResponse.json({ error: 'from_date and to_date required for custom period' }, { status: 400 });
    }
    fromDate = query.from_date;
    toDate = query.to_date;
  } else {
    toDate = now.toISOString();
    const pastDate = new Date();
    switch (query.period) {
      case 'week':
        pastDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        pastDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        pastDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        pastDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    fromDate = pastDate.toISOString();
  }

  let dbQuery = supabaseServer
    .from('timeline_items')
    .select(`
      *,
      category:categories(id, name, color, icon),
      memory:memories!inner(
        captured_at,
        note,
        title_override,
        memory_type,
        emotion_valence,
        is_highlight,
        salience_score,
        place_name,
        importance_level,
        tags
      )
    `)
    .eq('user_id', userId)
    .eq('type', 'memory')
    .gte('memories.captured_at', fromDate)
    .lte('memories.captured_at', toDate);

  // Filter by salience OR manual highlights
  if (query.include_manual_highlights) {
    dbQuery = dbQuery.or(`memories.salience_score.gte.${query.min_salience},memories.is_highlight.eq.true`);
  } else {
    dbQuery = dbQuery.gte('memories.salience_score', query.min_salience);
  }

  if (query.memory_type) dbQuery = dbQuery.eq('memories.memory_type', query.memory_type);
  if (query.importance_level) dbQuery = dbQuery.eq('memories.importance_level', query.importance_level);

  // Sorting
  const ascending = query.sort_order === 'asc';
  const sortField = query.sort_by === 'captured_at' ? 'memories.captured_at' :
                    query.sort_by === 'emotion_valence' ? 'memories.emotion_valence' :
                    'memories.salience_score';
  dbQuery = dbQuery.order(sortField, { ascending });

  // Pagination
  dbQuery = dbQuery.range(query.offset || 0, (query.offset || 0) + (query.limit || 50) - 1);

  const { data, error } = await dbQuery;

  if (error) {
    console.error('Highlights query error:', error);
    return NextResponse.json({ error: 'Failed to fetch highlights' }, { status: 500 });
  }

  // Transform to flatten memory fields
  const transformedData = (data || []).map((item: any) => {
    const memory = Array.isArray(item.memory) ? item.memory[0] : item.memory;
    return {
      ...item,
      ...memory,
      display_title: memory?.title_override || item.title,
      memory: undefined
    };
  });

  return NextResponse.json({
    highlights: transformedData,
    count: transformedData.length,
    period: query.period,
    date_range: { from: fromDate, to: toDate }
  });
}

export const GET = withStandardMiddleware(handleGetHighlights, {
  rateLimit: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 200
  }
});

export const OPTIONS = withStandardMiddleware(async () => {
  return new NextResponse(null, { status: 200 });
}, {
  auth: false
});
