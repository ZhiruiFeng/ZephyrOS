import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { getClientForAuthType } from '@/auth';
import {
  UpdateDailyStrategyStatusSchema,
  DailyStrategyItemWithDetails
} from '@/lib/daily-strategy-types';

export const dynamic = 'force-dynamic';

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
async function handleUpdateDailyStrategyStatus(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const userId = request.userId!;
  const statusData = request.validatedBody!;

  const client = await getClientForAuthType(request);
  if (!client) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

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
      return NextResponse.json({ error: 'Daily strategy item not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
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
    return NextResponse.json({
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

  return NextResponse.json({
    item: responseItem,
    message: 'Status updated successfully'
  });
}

// Apply middleware
export const PATCH = withStandardMiddleware(handleUpdateDailyStrategyStatus, {
  validation: {
    bodySchema: UpdateDailyStrategyStatusSchema
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 200
  }
});

// Explicit OPTIONS handler for CORS preflight
export const OPTIONS = withStandardMiddleware(async () => {
  return new NextResponse(null, { status: 200 });
}, {
  auth: false
});
