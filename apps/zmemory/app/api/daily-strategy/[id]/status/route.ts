import { NextRequest, NextResponse } from 'next/server';
import { getClientForAuthType, getUserIdFromRequest } from '@/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '@/lib/security';
import {
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
 * /api/daily-strategy/{id}/status:
 *   patch:
 *     summary: Update daily strategy item status
 *     description: Quick status update for a daily strategy item with completion details
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
 *             $ref: '#/components/schemas/UpdateDailyStrategyStatus'
 *           example:
 *             status: "completed"
 *             completion_notes: "Finished ahead of schedule"
 *             actual_energy_used: 7
 *             mood_impact: "positive"
 *             reflection_notes: "Learned a new approach that was very effective"
 *             lessons_learned: "Breaking down complex tasks into smaller chunks helps maintain focus"
 *             next_actions: "Apply this technique to other similar tasks"
 *     responses:
 *       200:
 *         description: Status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DailyStrategyItem'
 *       400:
 *         description: Invalid status update data
 *       404:
 *         description: Daily strategy item not found
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 200)) {
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
    const validationResult = UpdateDailyStrategyStatusSchema.safeParse(body);

    if (!validationResult.success) {
      return jsonWithCors(request, {
        error: 'Invalid status update data',
        details: validationResult.error.errors
      }, 400);
    }

    const statusData = validationResult.data;

    // Use the database function for status update
    const { data: updateResults, error: updateError } = await client
      .rpc('update_daily_strategy_status', {
        p_id: id,
        p_status: statusData.status,
        p_completion_notes: statusData.completion_notes || null,
        p_actual_energy_used: statusData.actual_energy_used || null,
        p_mood_impact: statusData.mood_impact || null,
        p_reflection_notes: statusData.reflection_notes || null,
        p_lessons_learned: statusData.lessons_learned || null,
        p_next_actions: statusData.next_actions || null,
        p_user_id: userId // Pass user_id for service role support
      });

    // The RPC returns an array with one row: [{ success: boolean, item_id: string }]
    const updateResult = updateResults?.[0];

    if (updateError || !updateResult || !updateResult.success) {
      console.error('Daily strategy status update error:', updateError);
      if (updateError?.message?.includes('not found') || (updateResult && !updateResult.success)) {
        return jsonWithCors(request, { error: 'Daily strategy item not found' }, 404);
      }
      return jsonWithCors(request, { error: 'Failed to update status' }, 500);
    }

    // Fetch the updated item with full details
    const { data: updatedItem, error: fetchError } = await client
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
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !updatedItem) {
      console.error('Failed to fetch updated daily strategy item:', fetchError);
      return jsonWithCors(request, { 
        message: 'Status updated successfully but failed to fetch updated item' 
      });
    }

    // Transform response
    const timelineItem = Array.isArray((updatedItem as any).timeline_item) 
      ? (updatedItem as any).timeline_item[0] 
      : (updatedItem as any).timeline_item;

    const responseItem: DailyStrategyItemWithDetails = {
      ...(updatedItem as any),
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

    return jsonWithCors(request, { 
      item: responseItem,
      message: 'Status updated successfully'
    });
  } catch (error) {
    console.error('Daily strategy status PATCH API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}
