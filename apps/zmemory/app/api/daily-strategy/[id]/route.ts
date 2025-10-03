import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { getClientForAuthType } from '@/auth';
import { z } from 'zod';
import {
  UpdateDailyStrategySchema,
  DailyStrategyItemWithDetails
} from '@/lib/daily-strategy-types';

export const dynamic = 'force-dynamic';

// Query schema for GET requests
const GetQuerySchema = z.object({
  include_timeline_item: z.enum(['true', 'false']).transform(val => val === 'true').default('false'),
  include_season: z.enum(['true', 'false']).transform(val => val === 'true').default('false'),
  include_initiative: z.enum(['true', 'false']).transform(val => val === 'true').default('false')
});

/**
 * @swagger
 * /api/daily-strategy/{id}:
 *   get:
 *     summary: Get a specific daily strategy item
 *     description: Retrieve a single daily strategy item by ID with optional detailed information
 *     tags: [Daily Strategy]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Daily strategy item ID
 *       - in: query
 *         name: include_timeline_item
 *         schema:
 *           type: boolean
 *         description: Include timeline item details
 *       - in: query
 *         name: include_season
 *         schema:
 *           type: boolean
 *         description: Include season details
 *       - in: query
 *         name: include_initiative
 *         schema:
 *           type: boolean
 *         description: Include initiative details
 *     responses:
 *       200:
 *         description: Daily strategy item found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DailyStrategyItem'
 *       404:
 *         description: Daily strategy item not found
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
async function handleGetDailyStrategyItem(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const userId = request.userId!;
  const { id } = await params;
  const { searchParams } = new URL(request.url);

  const queryResult = GetQuerySchema.safeParse(Object.fromEntries(searchParams));
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

  // Build selection based on includes
  let selectClause = '*';

  if (query.include_timeline_item) {
    selectClause += `,timeline_item:timeline_items!inner(
      id,
      type,
      title,
      description,
      status,
      priority,
      tags,
      metadata,
      category:categories(id, name, color, icon)
    )`;
  }

  if (query.include_season) {
    selectClause += `,season:seasons(id, title, theme, status)`;
  }

  if (query.include_initiative) {
    selectClause += `,initiative:core_strategy_initiatives(id, title, status, priority)`;
  }

  const { data, error } = await client
    .from('core_strategy_daily')
    .select(selectClause)
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Daily strategy item not found' }, { status: 404 });
    }
    console.error('Daily strategy item query error:', error);
    return NextResponse.json({ error: 'Failed to fetch daily strategy item' }, { status: 500 });
  }

  // Transform response if includes are requested
  let responseItem: DailyStrategyItemWithDetails = {
    ...(data as any),
    timeline_item: undefined,
    season: undefined,
    initiative: undefined
  };

  if (query.include_timeline_item && (data as any).timeline_item) {
    const timelineItem = Array.isArray((data as any).timeline_item) ? (data as any).timeline_item[0] : (data as any).timeline_item;
    responseItem.timeline_item = timelineItem ? {
      id: timelineItem.id,
      type: timelineItem.type,
      title: timelineItem.title,
      description: timelineItem.description,
      status: timelineItem.status,
      priority: timelineItem.priority,
      category: timelineItem.category,
      tags: timelineItem.tags || [],
      metadata: timelineItem.metadata || {}
    } : undefined;
  }

  if (query.include_season && (data as any).season) {
    const season = Array.isArray((data as any).season) ? (data as any).season[0] : (data as any).season;
    responseItem.season = season || undefined;
  }

  if (query.include_initiative && (data as any).initiative) {
    const initiative = Array.isArray((data as any).initiative) ? (data as any).initiative[0] : (data as any).initiative;
    responseItem.initiative = initiative || undefined;
  }

  return NextResponse.json({ item: responseItem });
}

/**
 * @swagger
 * /api/daily-strategy/{id}:
 *   put:
 *     summary: Update a daily strategy item
 *     description: Update an existing daily strategy item
 *     tags: [Daily Strategy]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Daily strategy item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateDailyStrategy'
 *           example:
 *             importance_level: "critical"
 *             planned_duration_minutes: 180
 *             status: "in_progress"
 *             required_energy_level: 9
 *             tags: ["urgent", "focus-mode"]
 *     responses:
 *       200:
 *         description: Daily strategy item updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DailyStrategyItem'
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Daily strategy item not found
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
async function handleUpdateDailyStrategyItem(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const userId = request.userId!;
  const { id } = await params;
  const updateData = request.validatedBody!;

  const client = await getClientForAuthType(request);
  if (!client) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // Build update payload (only include fields that are provided)
  const updatePayload: any = {
    updated_at: new Date().toISOString()
  };

  // Add provided fields to the update payload
  Object.keys(updateData).forEach(key => {
    if (updateData[key as keyof typeof updateData] !== undefined) {
      updatePayload[key] = updateData[key as keyof typeof updateData];
    }
  });

  const { data, error } = await client
    .from('core_strategy_daily')
    .update(updatePayload)
    .eq('id', id)
    .eq('user_id', userId)
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
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Daily strategy item not found' }, { status: 404 });
    }
    console.error('Daily strategy update error:', error);
    return NextResponse.json({ error: 'Failed to update daily strategy item' }, { status: 500 });
  }

  // Transform response
  const timelineItem = Array.isArray((data as any).timeline_item) ? (data as any).timeline_item[0] : (data as any).timeline_item;
  const responseItem: DailyStrategyItemWithDetails = {
    ...(data as any),
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
    season: undefined,
    initiative: undefined
  };

  return NextResponse.json({ item: responseItem });
}

/**
 * @swagger
 * /api/daily-strategy/{id}:
 *   delete:
 *     summary: Delete a daily strategy item
 *     description: Remove a daily strategy item from the system
 *     tags: [Daily Strategy]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Daily strategy item ID
 *     responses:
 *       200:
 *         description: Daily strategy item deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Daily strategy item deleted successfully"
 *       404:
 *         description: Daily strategy item not found
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
async function handleDeleteDailyStrategyItem(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const userId = request.userId!;
  const { id } = await params;

  const client = await getClientForAuthType(request);
  if (!client) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { error } = await client
    .from('core_strategy_daily')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Daily strategy delete error:', error);
    return NextResponse.json({ error: 'Failed to delete daily strategy item' }, { status: 500 });
  }

  return NextResponse.json({
    message: 'Daily strategy item deleted successfully'
  });
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetDailyStrategyItem, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 300
  }
});

export const PUT = withStandardMiddleware(handleUpdateDailyStrategyItem, {
  validation: {
    bodySchema: UpdateDailyStrategySchema
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
  }
});

export const DELETE = withStandardMiddleware(handleDeleteDailyStrategyItem, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
  }
});

// Explicit OPTIONS handler for CORS preflight
export const OPTIONS = withStandardMiddleware(async () => {
  return new NextResponse(null, { status: 200 });
}, {
  auth: false
});
