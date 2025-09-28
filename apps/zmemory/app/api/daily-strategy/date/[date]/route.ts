import { NextRequest, NextResponse } from 'next/server';
import { createClientForRequest, getUserIdFromRequest } from '@/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '@/lib/security';
import {
  DailyStrategyQuerySchema,
  DailyStrategyItemWithDetails,
  type DailyStrategyQuery
} from '@/lib/daily-strategy-types';

interface RouteParams {
  params: Promise<{
    date: string;
  }>;
}

/**
 * @swagger
 * /api/daily-strategy/date/{date}:
 *   get:
 *     summary: Get daily strategy items for a specific date
 *     description: Retrieve all daily strategy items for a specific date with optional filtering
 *     tags: [Daily Strategy]
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *         description: Date in YYYY-MM-DD format
 *       - in: query
 *         name: strategy_type
 *         schema:
 *           type: string
 *           enum: [priority, planning, reflection, adventure, learning, milestone, insight, routine]
 *         description: Filter by strategy type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [planned, in_progress, completed, deferred, cancelled]
 *         description: Filter by status
 *       - in: query
 *         name: timeline_item_type
 *         schema:
 *           type: string
 *           enum: [task, activity, memory, routine, habit]
 *         description: Filter by timeline item type
 *       - in: query
 *         name: include_timeline_item
 *         schema:
 *           type: boolean
 *         description: Include timeline item details
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [priority_order, importance_level, created_at, updated_at]
 *           default: priority_order
 *         description: Sort field
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Daily strategy items for the specified date
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 date:
 *                   type: string
 *                   description: The requested date
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DailyStrategyItem'
 *                 count:
 *                   type: integer
 *                 by_type:
 *                   type: object
 *                   description: Items grouped by strategy type
 *       400:
 *         description: Invalid date format or query parameters
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 300)) { // 300 requests per 15 minutes
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

    const { date } = await params;

    // Validate date format
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(date)) {
      return jsonWithCors(request, { 
        error: 'Invalid date format. Expected YYYY-MM-DD' 
      }, 400);
    }

    const { searchParams } = new URL(request.url);
    
    // Add the date to search params for validation
    searchParams.set('date', date);
    
    const queryResult = DailyStrategyQuerySchema.safeParse(Object.fromEntries(searchParams));
    
    if (!queryResult.success) {
      return jsonWithCors(request, { 
        error: 'Invalid query parameters', 
        details: queryResult.error.errors 
      }, 400);
    }

    const query: DailyStrategyQuery = queryResult.data;

    // Build query with date filter
    let selectClause = `
      *,
      timeline_item:timeline_items!inner(
        id,
        type,
        title,
        description,
        status,
        priority,
        tags,
        metadata,
        category:categories(id, name, color, icon)
      )
    `;

    // Add optional joins
    if (query.include_season) {
      selectClause += `,season:seasons(id, title, theme, status)`;
    }
    if (query.include_initiative) {
      selectClause += `,initiative:core_strategy_initiatives(id, title, status, priority)`;
    }

    let dbQuery = client
      .from('core_strategy_daily')
      .select(selectClause)
      .eq('user_id', userId)
      .eq('local_date', date);

    // Apply additional filters
    if (query.strategy_type) {
      dbQuery = dbQuery.eq('strategy_type', query.strategy_type);
    }
    if (query.importance_level) {
      dbQuery = dbQuery.eq('importance_level', query.importance_level);
    }
    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status);
    }
    if (query.planned_time_of_day) {
      dbQuery = dbQuery.eq('planned_time_of_day', query.planned_time_of_day);
    }
    if (query.timeline_item_type) {
      dbQuery = dbQuery.eq('timeline_item_type', query.timeline_item_type);
    }
    if (query.season_id) {
      dbQuery = dbQuery.eq('season_id', query.season_id);
    }
    if (query.initiative_id) {
      dbQuery = dbQuery.eq('initiative_id', query.initiative_id);
    }

    // Apply search filter
    if (query.search) {
      dbQuery = dbQuery.or(`
        timeline_items.title.ilike.%${query.search}%,
        timeline_items.description.ilike.%${query.search}%,
        completion_notes.ilike.%${query.search}%,
        reflection_notes.ilike.%${query.search}%
      `);
    }

    // Apply tags filter
    if (query.tags) {
      const filterTags = query.tags.split(',').map(tag => tag.trim());
      dbQuery = dbQuery.overlaps('tags', filterTags);
    }

    // Apply sorting
    const ascending = query.sort_order === 'asc';
    switch (query.sort_by) {
      case 'priority_order':
        dbQuery = dbQuery.order('strategy_type', { ascending: true })
                         .order('priority_order', { ascending: true });
        break;
      case 'importance_level':
        // Sort by importance level (critical > high > medium > low)
        dbQuery = dbQuery.order('importance_level', { ascending: false });
        break;
      default:
        dbQuery = dbQuery.order(query.sort_by, { ascending });
    }

    const { data, error } = await dbQuery;

    if (error) {
      console.error('Daily strategy date query error:', error);
      return jsonWithCors(request, { error: 'Failed to fetch daily strategy items' }, 500);
    }

    // Transform data
    const transformedData: DailyStrategyItemWithDetails[] = (data || []).map((item: any) => {
      const timelineItem = Array.isArray(item.timeline_item) ? item.timeline_item[0] : item.timeline_item;
      const season = Array.isArray(item.season) ? item.season[0] : item.season;
      const initiative = Array.isArray(item.initiative) ? item.initiative[0] : item.initiative;

      return {
        ...item,
        timeline_item: timelineItem ? {
          id: timelineItem.id,
          type: timelineItem.type,
          title: timelineItem.title,
          description: timelineItem.description,
          status: timelineItem.status,
          priority: timelineItem.priority,
          category: timelineItem.category,
          tags: timelineItem.tags || [],
          metadata: timelineItem.metadata || {}
        } : undefined,
        season: season || undefined,
        initiative: initiative || undefined
      };
    });

    // Group items by strategy type for easier consumption
    const byType = transformedData.reduce((acc, item) => {
      if (!acc[item.strategy_type]) {
        acc[item.strategy_type] = [];
      }
      acc[item.strategy_type].push(item);
      return acc;
    }, {} as Record<string, DailyStrategyItemWithDetails[]>);

    return jsonWithCors(request, { 
      date: date,
      items: transformedData,
      count: transformedData.length,
      by_type: byType
    });
  } catch (error) {
    console.error('Daily strategy date API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}
