import { NextRequest, NextResponse } from 'next/server';
import { getClientForAuthType, getUserIdFromRequest } from '@/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '@/lib/security';
import {
  UpdateDailyStrategySchema,
  UpdateDailyStrategyStatusSchema,
  DailyStrategyItemWithDetails
} from '@/lib/daily-strategy-types';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

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
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = await getClientForAuthType(request);
    if (!client) {
      return jsonWithCors(request, { error: 'Supabase not configured' }, 500);
    }

    const { id } = await params;
    
    const { searchParams } = new URL(request.url);
    const includeTimelineItem = searchParams.get('include_timeline_item') === 'true';
    const includeSeason = searchParams.get('include_season') === 'true';
    const includeInitiative = searchParams.get('include_initiative') === 'true';

    // Build selection based on includes
    let selectClause = '*';
    
    if (includeTimelineItem) {
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
    
    if (includeSeason) {
      selectClause += `,season:seasons(id, title, theme, status)`;
    }
    
    if (includeInitiative) {
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
        return jsonWithCors(request, { error: 'Daily strategy item not found' }, 404);
      }
      console.error('Daily strategy item query error:', error);
      return jsonWithCors(request, { error: 'Failed to fetch daily strategy item' }, 500);
    }

    // Transform response if includes are requested
    let responseItem: DailyStrategyItemWithDetails = {
      ...(data as any),
      timeline_item: undefined,
      season: undefined,
      initiative: undefined
    };

    if (includeTimelineItem && (data as any).timeline_item) {
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

    if (includeSeason && (data as any).season) {
      const season = Array.isArray((data as any).season) ? (data as any).season[0] : (data as any).season;
      responseItem.season = season || undefined;
    }

    if (includeInitiative && (data as any).initiative) {
      const initiative = Array.isArray((data as any).initiative) ? (data as any).initiative[0] : (data as any).initiative;
      responseItem.initiative = initiative || undefined;
    }

    return jsonWithCors(request, { item: responseItem });
  } catch (error) {
    console.error('Daily strategy GET API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
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
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 100)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = await getClientForAuthType(request);
    if (!client) {
      return jsonWithCors(request, { error: 'Supabase not configured' }, 500);
    }

    const { id } = await params;
    const body = await request.json();
    const validationResult = UpdateDailyStrategySchema.safeParse(body);

    if (!validationResult.success) {
      return jsonWithCors(request, {
        error: 'Invalid update data',
        details: validationResult.error.errors
      }, 400);
    }

    const updateData = validationResult.data;

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
        return jsonWithCors(request, { error: 'Daily strategy item not found' }, 404);
      }
      console.error('Daily strategy update error:', error);
      return jsonWithCors(request, { error: 'Failed to update daily strategy item' }, 500);
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

    return jsonWithCors(request, { item: responseItem });
  } catch (error) {
    console.error('Daily strategy PUT API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
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
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 100)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = await getClientForAuthType(request);
    if (!client) {
      return jsonWithCors(request, { error: 'Supabase not configured' }, 500);
    }

    const { id } = await params;
    const { error } = await client
      .from('core_strategy_daily')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Daily strategy delete error:', error);
      return jsonWithCors(request, { error: 'Failed to delete daily strategy item' }, 500);
    }

    return jsonWithCors(request, { 
      message: 'Daily strategy item deleted successfully' 
    });
  } catch (error) {
    console.error('Daily strategy DELETE API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}
