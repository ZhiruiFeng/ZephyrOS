import { NextRequest, NextResponse } from 'next/server';
import { createClientForRequest, getUserIdFromRequest } from '../../../lib/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '../../../lib/security';
import {
  DailyStrategyQuerySchema,
  CreateDailyStrategySchema,
  DailyStrategyItem,
  DailyStrategyItemWithDetails,
  type DailyStrategyQuery
} from '../../../lib/daily-strategy-types';

/**
 * @swagger
 * /api/daily-strategy:
 *   get:
 *     summary: Get daily strategy items with filtering
 *     description: Retrieve daily strategy items with support for filtering by date, type, status, and more
 *     tags: [Daily Strategy]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *         description: Specific date to filter by (YYYY-MM-DD)
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *         description: Start date for date range filter
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *         description: End date for date range filter
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
 *         description: Include timeline item details in response
 *     responses:
 *       200:
 *         description: List of daily strategy items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DailyStrategyItem'
 *                 count:
 *                   type: integer
 *                 has_more:
 *                   type: boolean
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting - more permissive for GET requests
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

    const { searchParams } = new URL(request.url);
    const queryResult = DailyStrategyQuerySchema.safeParse(Object.fromEntries(searchParams));
    
    if (!queryResult.success) {
      return jsonWithCors(request, { 
        error: 'Invalid query parameters', 
        details: queryResult.error.errors 
      }, 400);
    }

    const query: DailyStrategyQuery = queryResult.data;

    // Build base query with proper selection
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

    // Add optional joins based on query parameters
    if (query.include_season) {
      selectClause += `,season:seasons(id, title, theme, status)`;
    }
    if (query.include_initiative) {
      selectClause += `,initiative:core_strategy_initiatives(id, title, status, priority)`;
    }

    let dbQuery = client
      .from('core_strategy_daily')
      .select(selectClause)
      .eq('user_id', userId);

    // Apply date filters
    if (query.date) {
      dbQuery = dbQuery.eq('local_date', query.date);
    } else {
      if (query.date_from) {
        dbQuery = dbQuery.gte('local_date', query.date_from);
      }
      if (query.date_to) {
        dbQuery = dbQuery.lte('local_date', query.date_to);
      }
    }

    // Apply strategy filters
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

    // Apply timeline item filters
    if (query.timeline_item_type) {
      dbQuery = dbQuery.eq('timeline_item_type', query.timeline_item_type);
    }
    if (query.timeline_item_id) {
      dbQuery = dbQuery.eq('timeline_item_id', query.timeline_item_id);
    }

    // Apply strategy framework filters
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
        dbQuery = dbQuery.order('local_date', { ascending: false })
                         .order('strategy_type', { ascending: true })
                         .order('priority_order', { ascending: true });
        break;
      case 'importance_level':
        // Sort by importance level (critical > high > medium > low)
        dbQuery = dbQuery.order('importance_level', { ascending: false });
        break;
      case 'local_date':
        dbQuery = dbQuery.order('local_date', { ascending });
        break;
      default:
        dbQuery = dbQuery.order(query.sort_by, { ascending });
    }

    // Apply pagination
    dbQuery = dbQuery.range(query.offset, query.offset + query.limit - 1);

    const { data, error } = await dbQuery;

    if (error) {
      console.error('Daily strategy items query error:', error);
      return jsonWithCors(request, { error: 'Failed to fetch daily strategy items' }, 500);
    }

    // Transform data to include timeline item details at the top level
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

    return jsonWithCors(request, { 
      items: transformedData,
      count: transformedData.length,
      has_more: transformedData.length === query.limit
    });
  } catch (error) {
    console.error('Daily strategy API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

/**
 * @swagger
 * /api/daily-strategy:
 *   post:
 *     summary: Create a new daily strategy item
 *     description: Create a new daily strategy item linking to a timeline item
 *     tags: [Daily Strategy]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDailyStrategy'
 *           example:
 *             timeline_item_id: "uuid-of-timeline-item"
 *             strategy_type: "priority"
 *             local_date: "2025-09-24"
 *             importance_level: "high"
 *             planned_duration_minutes: 120
 *             planned_time_of_day: "morning"
 *             required_energy_level: 8
 *             tags: ["focus", "important"]
 *     responses:
 *       201:
 *         description: Daily strategy item created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DailyStrategyItem'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 50)) {
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

    const body = await request.json();
    const validationResult = CreateDailyStrategySchema.safeParse(body);

    if (!validationResult.success) {
      return jsonWithCors(request, {
        error: 'Invalid daily strategy data',
        details: validationResult.error.errors
      }, 400);
    }

    const strategyData = validationResult.data;

    // Verify that the timeline item exists and belongs to the user
    const { data: timelineItem, error: timelineError } = await client
      .from('timeline_items')
      .select('id, type, title')
      .eq('id', strategyData.timeline_item_id)
      .eq('user_id', userId)
      .single();

    if (timelineError || !timelineItem) {
      return jsonWithCors(request, { 
        error: 'Timeline item not found or access denied' 
      }, 400);
    }

    // Use the database function to add the daily strategy item
    const { data: newItemId, error: createError } = await client
      .rpc('add_daily_strategy_item', {
        p_timeline_item_id: strategyData.timeline_item_id,
        p_strategy_type: strategyData.strategy_type,
        p_local_date: strategyData.local_date,
        p_importance_level: strategyData.importance_level,
        p_priority_order: strategyData.priority_order || null,
        p_planned_duration_minutes: strategyData.planned_duration_minutes || null,
        p_planned_time_of_day: strategyData.planned_time_of_day || null,
        p_required_energy_level: strategyData.required_energy_level || null,
        p_tags: strategyData.tags,
        p_metadata: strategyData.metadata
      });

    if (createError || !newItemId) {
      console.error('Daily strategy creation error:', createError);
      return jsonWithCors(request, { error: 'Failed to create daily strategy item' }, 500);
    }

    // Fetch the created item with full details
    const { data: createdItem, error: fetchError } = await client
      .from('core_strategy_daily')
      .select(`
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
      `)
      .eq('id', newItemId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !createdItem) {
      console.error('Failed to fetch created daily strategy item:', fetchError);
      return jsonWithCors(request, { error: 'Item created but failed to fetch details' }, 500);
    }

    // Transform response to include timeline item details
    const timelineItemData = Array.isArray((createdItem as any).timeline_item) 
      ? (createdItem as any).timeline_item[0] 
      : (createdItem as any).timeline_item;

    const responseItem: DailyStrategyItemWithDetails = {
      ...(createdItem as any),
      timeline_item: timelineItemData ? {
        id: timelineItemData.id,
        type: timelineItemData.type,
        title: timelineItemData.title,
        description: timelineItemData.description,
        status: timelineItemData.status,
        priority: timelineItemData.priority,
        category: timelineItemData.category,
        tags: timelineItemData.tags || [],
        metadata: timelineItemData.metadata || {}
      } : undefined,
      season: undefined,
      initiative: undefined
    };

    return jsonWithCors(request, { item: responseItem }, 201);
  } catch (error) {
    console.error('Daily strategy POST API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}
