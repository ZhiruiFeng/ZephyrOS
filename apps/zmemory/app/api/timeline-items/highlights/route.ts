import { NextRequest, NextResponse } from 'next/server';
import { createClientForRequest, getUserIdFromRequest } from '../../../../lib/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '../../../../lib/security';
import { z } from 'zod';

// Query schema for highlights
const HighlightsQuerySchema = z.object({
  period: z.enum(['week', 'month', 'quarter', 'year', 'custom']).default('week'),
  from_date: z.string().datetime({ offset: true }).optional(),
  to_date: z.string().datetime({ offset: true }).optional(),
  min_salience: z.string().optional().transform(v => v ? parseFloat(v) : 0.7), // Default to high salience
  include_manual_highlights: z.string().optional().transform(v => v === 'true').default(true),
  limit: z.string().optional().transform(v => parseInt(v || '50')),
  offset: z.string().optional().transform(v => parseInt(v || '0')),
  memory_type: z.enum(['note', 'link', 'file', 'thought', 'quote', 'insight']).optional(),
  importance_level: z.enum(['low', 'medium', 'high']).optional(),
  sort_by: z.enum(['salience_score', 'captured_at', 'emotion_valence']).default('salience_score'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

type HighlightsQuery = z.infer<typeof HighlightsQuerySchema>;

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
 *         description: Time period for highlights
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for custom period
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for custom period
 *       - in: query
 *         name: min_salience
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *           default: 0.7
 *         description: Minimum salience score for highlights
 *       - in: query
 *         name: include_manual_highlights
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include manually marked highlights regardless of salience
 *       - in: query
 *         name: memory_type
 *         schema:
 *           type: string
 *           enum: [note, link, file, thought, quote, insight]
 *         description: Filter by memory type
 *       - in: query
 *         name: importance_level
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *         description: Filter by importance level
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of highlights to return
 *     responses:
 *       200:
 *         description: List of highlight memories for review
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting - more permissive for highlights
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 60 * 60 * 1000, 200)) { // 200 requests per hour
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
    const queryResult = HighlightsQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryResult.error.errors },
        { status: 400 }
      );
    }

    const query = queryResult.data;

    console.log('=== HIGHLIGHTS API DEBUG ===');
    console.log('Query params:', JSON.stringify(query, null, 2));

    // Calculate date range based on period
    let fromDate: string;
    let toDate: string;

    if (query.period === 'custom') {
      if (!query.from_date || !query.to_date) {
        return jsonWithCors(request, { 
          error: 'from_date and to_date are required for custom period' 
        }, 400);
      }
      fromDate = query.from_date;
      toDate = query.to_date;
    } else {
      const now = new Date();
      toDate = now.toISOString();
      
      switch (query.period) {
        case 'week':
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'month':
          fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'quarter':
          fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'year':
          fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
          break;
        default:
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      }
    }

    // Build query for highlights
    let dbQuery = client
      .from('timeline_items')
      .select(`
        *,
        category:categories(id, name, color, icon),
        memory:memories!inner(
          captured_at,
          happened_range,
          note,
          title_override,
          memory_type,
          emotion_valence,
          emotion_arousal,
          energy_delta,
          place_name,
          latitude,
          longitude,
          is_highlight,
          salience_score,
          source,
          context,
          mood,
          importance_level,
          related_to,
          tags,
          status
        )
      `)
      .eq('user_id', userId)
      .eq('type', 'memory')
      .gte('memories.captured_at', fromDate)
      .lte('memories.captured_at', toDate);

    // Build highlight conditions
    const highlightConditions: string[] = [];
    
    // Include manually marked highlights if requested
    if (query.include_manual_highlights) {
      highlightConditions.push('memories.is_highlight.eq.true');
    }
    
    // Include high salience memories
    highlightConditions.push(`memories.salience_score.gte.${query.min_salience}`);
    
    // Apply highlight conditions (OR logic)
    if (highlightConditions.length > 0) {
      dbQuery = dbQuery.or(highlightConditions.join(','));
    }

    // Apply additional filters
    if (query.memory_type) {
      dbQuery = dbQuery.eq('memories.memory_type', query.memory_type);
    }
    if (query.importance_level) {
      dbQuery = dbQuery.eq('memories.importance_level', query.importance_level);
    }

    // Apply sorting
    const ascending = query.sort_order === 'asc';
    switch (query.sort_by) {
      case 'salience_score':
        dbQuery = dbQuery.order('memories.salience_score', { ascending });
        break;
      case 'captured_at':
        dbQuery = dbQuery.order('memories.captured_at', { ascending });
        break;
      case 'emotion_valence':
        dbQuery = dbQuery.order('memories.emotion_valence', { ascending });
        break;
    }

    // Apply pagination
    dbQuery = dbQuery.range(query.offset, query.offset + query.limit - 1);

    const { data, error } = await dbQuery;

    if (error) {
      console.error('Highlights query error:', error);
      return jsonWithCors(request, { error: 'Failed to fetch highlights' }, 500);
    }

    // Transform and enrich the data
    const transformedData = (data || []).map(item => {
      const memory = Array.isArray(item.memory) ? item.memory[0] : item.memory;
      
      // Calculate highlight reason
      const highlightReasons = [];
      if (memory?.is_highlight) highlightReasons.push('manual');
      if (memory?.salience_score >= query.min_salience) highlightReasons.push('high_salience');
      
      // Calculate days ago
      const daysAgo = memory?.captured_at 
        ? Math.floor((Date.now() - new Date(memory.captured_at).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        ...item,
        // Flatten memory data
        captured_at: memory?.captured_at,
        happened_range: memory?.happened_range,
        note: memory?.note,
        title_override: memory?.title_override,
        memory_type: memory?.memory_type,
        emotion_valence: memory?.emotion_valence,
        emotion_arousal: memory?.emotion_arousal,
        energy_delta: memory?.energy_delta,
        place_name: memory?.place_name,
        latitude: memory?.latitude,
        longitude: memory?.longitude,
        is_highlight: memory?.is_highlight,
        salience_score: memory?.salience_score,
        source: memory?.source,
        context: memory?.context,
        mood: memory?.mood,
        importance_level: memory?.importance_level,
        related_to: memory?.related_to,
        memory_tags: memory?.tags,
        memory_status: memory?.status,
        // Add computed fields for highlights
        display_title: memory?.title_override || item.title,
        highlight_reasons: highlightReasons,
        days_ago: daysAgo,
        // Remove nested memory object
        memory: undefined
      };
    });

    // Group by days for better review experience
    const groupedByDay: { [key: string]: any[] } = {};
    transformedData.forEach(item => {
      const capturedDate = item.captured_at ? 
        new Date(item.captured_at).toISOString().split('T')[0] : 
        'unknown';
      
      if (!groupedByDay[capturedDate]) {
        groupedByDay[capturedDate] = [];
      }
      groupedByDay[capturedDate].push(item);
    });

    // Calculate summary statistics
    const stats = {
      total_highlights: transformedData.length,
      manual_highlights: transformedData.filter(item => item.is_highlight).length,
      high_salience_count: transformedData.filter(item => item.salience_score >= query.min_salience).length,
      avg_salience: transformedData.length > 0 ? 
        transformedData.reduce((sum, item) => sum + (item.salience_score || 0), 0) / transformedData.length : 0,
      date_range: {
        from: fromDate,
        to: toDate,
        period: query.period
      },
      days_covered: Object.keys(groupedByDay).length
    };

    console.log(`Found ${transformedData.length} highlights for ${query.period} period`);

    return jsonWithCors(request, { 
      highlights: transformedData,
      grouped_by_day: groupedByDay,
      stats,
      query: {
        period: query.period,
        min_salience: query.min_salience,
        include_manual_highlights: query.include_manual_highlights
      }
    });

  } catch (error) {
    console.error('Highlights API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}