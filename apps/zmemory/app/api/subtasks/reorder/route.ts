import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { getClientForAuthType } from '@/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Validation schema for reorder request
const ReorderSubtasksSchema = z.object({
  parent_task_id: z.string().uuid('Invalid parent task ID'),
  subtask_orders: z.array(z.object({
    task_id: z.string().uuid('Invalid task ID'),
    new_order: z.number().int().min(0, 'Order must be non-negative')
  })).min(1, 'At least one subtask order must be provided')
});

/**
 * PUT /api/subtasks/reorder - Reorder subtasks within a parent task
 *
 * Updates the order of subtasks for a given parent task.
 */
async function handleReorderSubtasks(
  request: EnhancedRequest
): Promise<NextResponse> {
  const userId = request.userId!;
  const client = await getClientForAuthType(request);

  if (!client) {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }

  const body = await request.json();

  // Validate request body
  const validationResult = ReorderSubtasksSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      { error: 'Invalid reorder data', details: validationResult.error.errors },
      { status: 400 }
    );
  }

  const reorderData = validationResult.data;

  // Verify the parent task exists and belongs to the user
  const { data: parentTask, error: parentError } = await client
    .from('tasks')
    .select('id')
    .eq('id', reorderData.parent_task_id)
    .eq('user_id', userId)
    .single();

  if (parentError || !parentTask) {
    return NextResponse.json({ error: 'Parent task not found' }, { status: 404 });
  }

  // Get all subtask IDs to verify they exist and belong to this parent
  const subtaskIds = reorderData.subtask_orders.map(item => item.task_id);

  const { data: subtasks, error: subtasksError } = await client
    .from('tasks')
    .select('id, parent_task_id')
    .in('id', subtaskIds)
    .eq('user_id', userId);

  if (subtasksError) {
    return NextResponse.json({ error: 'Failed to verify subtasks' }, { status: 500 });
  }

  // Verify all subtasks exist and belong to the specified parent
  if (!subtasks || subtasks.length !== subtaskIds.length) {
    return NextResponse.json({ error: 'One or more subtasks not found' }, { status: 404 });
  }

  const invalidSubtasks = subtasks.filter(task => task.parent_task_id !== reorderData.parent_task_id);
  if (invalidSubtasks.length > 0) {
    return NextResponse.json(
      { error: 'One or more tasks are not subtasks of the specified parent' },
      { status: 400 }
    );
  }

  // Update each subtask's order
  let updatedCount = 0;
  const updates = reorderData.subtask_orders.map(item => ({
    id: item.task_id,
    subtask_order: item.new_order,
    updated_at: new Date().toISOString()
  }));

  for (const update of updates) {
    const { error: updateError } = await client
      .from('tasks')
      .update({
        subtask_order: update.subtask_order,
        updated_at: update.updated_at
      })
      .eq('id', update.id)
      .eq('user_id', userId);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update order for task ${update.id}` },
        { status: 500 }
      );
    }

    updatedCount++;
  }

  return NextResponse.json({
    message: 'Subtasks reordered successfully',
    updated_count: updatedCount
  });
}

// Apply middleware
export const PUT = withStandardMiddleware(handleReorderSubtasks, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 20
  }
});

// Explicit OPTIONS handler for CORS preflight
export const OPTIONS = withStandardMiddleware(async () => {
  return new NextResponse(null, { status: 200 });
}, {
  auth: false
});
