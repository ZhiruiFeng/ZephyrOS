import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabaseServer } from '@/lib/config/supabase-server';
import {
  DailyStrategyQuerySchema,
  CreateDailyStrategySchema,
  DailyStrategyItemWithDetails,
  type DailyStrategyQuery
} from '@/lib/types/daily-strategy-types';

export const dynamic = 'force-dynamic';

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
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
async function handleGetDailyStrategy(
  request: EnhancedRequest
): Promise<NextResponse> {
  const userId = request.userId!;
  const { searchParams } = new URL(request.url);

  const queryResult = DailyStrategyQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!queryResult.success) {
    return NextResponse.json({
      error: 'Invalid query parameters',
      details: queryResult.error.errors
    }, { status: 400 });
  }

  const query: DailyStrategyQuery = queryResult.data;

  if (!supabaseServer) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

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

  let dbQuery = supabaseServer
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
  if (query.strategy_type) dbQuery = dbQuery.eq('strategy_type', query.strategy_type);
  if (query.importance_level) dbQuery = dbQuery.eq('importance_level', query.importance_level);
  if (query.status) dbQuery = dbQuery.eq('status', query.status);
  if (query.planned_time_of_day) dbQuery = dbQuery.eq('planned_time_of_day', query.planned_time_of_day);

  // Apply timeline item filters
  if (query.timeline_item_type) dbQuery = dbQuery.eq('timeline_item_type', query.timeline_item_type);
  if (query.timeline_item_id) dbQuery = dbQuery.eq('timeline_item_id', query.timeline_item_id);

  // Apply strategy framework filters
  if (query.season_id) dbQuery = dbQuery.eq('season_id', query.season_id);
  if (query.initiative_id) dbQuery = dbQuery.eq('initiative_id', query.initiative_id);

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
      dbQuery = dbQuery.order('importance_level', { ascending: false });
      break;
    case 'local_date':
      dbQuery = dbQuery.order('local_date', { ascending });
      break;
    default:
      dbQuery = dbQuery.order(query.sort_by, { ascending });
  }

  // Apply pagination
  dbQuery = dbQuery.range(query.offset || 0, (query.offset || 0) + (query.limit || 20) - 1);

  const { data, error } = await dbQuery;

  if (error) {
    console.error('Daily strategy items query error:', error);
    return NextResponse.json({ error: 'Failed to fetch daily strategy items' }, { status: 500 });
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

  return NextResponse.json({
    items: transformedData,
    count: transformedData.length,
    has_more: transformedData.length === (query.limit || 20)
  });
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
 *     responses:
 *       201:
 *         description: Daily strategy item created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
async function handleCreateDailyStrategy(
  request: EnhancedRequest
): Promise<NextResponse> {
  const userId = request.userId!;
  const strategyData = request.validatedBody!;

  if (!supabaseServer) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // Verify that the timeline item exists and belongs to the user
  const { data: timelineItem, error: timelineError } = await supabaseServer
    .from('timeline_items')
    .select('id, type, title')
    .eq('id', strategyData.timeline_item_id)
    .eq('user_id', userId)
    .single();

  if (timelineError || !timelineItem) {
    return NextResponse.json({
      error: 'Timeline item not found or access denied'
    }, { status: 400 });
  }

  // Use the database function to add the daily strategy item
  const { data: newItemId, error: createError } = await supabaseServer
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
      p_metadata: strategyData.metadata,
      p_user_id: userId
    });

  if (createError || !newItemId) {
    console.error('Daily strategy creation error:', createError);
    return NextResponse.json({ error: 'Failed to create daily strategy item' }, { status: 500 });
  }

  // Fetch the created item with full details
  const { data: createdItem, error: fetchError } = await supabaseServer
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
    return NextResponse.json({ error: 'Item created but failed to fetch details' }, { status: 500 });
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

  return NextResponse.json({ item: responseItem }, { status: 201 });
}

export const GET = withStandardMiddleware(handleGetDailyStrategy, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 300
  }
});

export const POST = withStandardMiddleware(handleCreateDailyStrategy, {
  validation: { bodySchema: CreateDailyStrategySchema },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 50
  }
});

export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
