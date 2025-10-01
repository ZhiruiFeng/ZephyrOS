import { NextRequest, NextResponse } from 'next/server';
import { getClientForAuthType, getUserIdFromRequest } from '@/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '@/lib/security';
import { z } from 'zod';

// Validation schema for reorder request
const ReorderSubtasksSchema = z.object({
  parent_task_id: z.string().uuid('Invalid parent task ID'),
  subtask_orders: z.array(z.object({
    task_id: z.string().uuid('Invalid task ID'),
    new_order: z.number().int().min(0, 'Order must be non-negative')
  })).min(1, 'At least one subtask order must be provided')
});

/**
 * @swagger
 * /api/subtasks/reorder:
 *   put:
 *     summary: Reorder subtasks within a parent task
 *     description: Update the order of subtasks for a given parent task
 *     tags: [Subtasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - parent_task_id
 *               - subtask_orders
 *             properties:
 *               parent_task_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the parent task
 *               subtask_orders:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - task_id
 *                     - new_order
 *                   properties:
 *                     task_id:
 *                       type: string
 *                       format: uuid
 *                       description: ID of the subtask to reorder
 *                     new_order:
 *                       type: integer
 *                       minimum: 0
 *                       description: New order position for the subtask
 *           example:
 *             parent_task_id: "123e4567-e89b-12d3-a456-426614174000"
 *             subtask_orders:
 *               - task_id: "456e7890-e89b-12d3-a456-426614174001"
 *                 new_order: 0
 *               - task_id: "789e0123-e89b-12d3-a456-426614174002"
 *                 new_order: 1
 *     responses:
 *       200:
 *         description: Subtasks reordered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Subtasks reordered successfully"
 *                 updated_count:
 *                   type: integer
 *                   example: 2
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Parent task or one of the subtasks not found
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function PUT(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 20)) { // Stricter limit for PUT
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const body = await request.json();
    
    console.log('=== REORDER SUBTASKS API DEBUG ===');
    console.log('Received body:', JSON.stringify(body, null, 2));
    
    // Validate request body
    const validationResult = ReorderSubtasksSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('REORDER SUBTASKS Validation failed:', validationResult.error.errors);
      return jsonWithCors(request,
        { error: 'Invalid reorder data', details: validationResult.error.errors },
        400
      );
    }

    const reorderData = validationResult.data;

    // Enforce auth
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = await getClientForAuthType(request);
    if (!client) {
      return jsonWithCors(request, { error: 'Database connection failed' }, 500);
    }

    // Verify the parent task exists and belongs to the user
    const { data: parentTask, error: parentError } = await client
      .from('tasks')
      .select('id')
      .eq('id', reorderData.parent_task_id)
      .eq('user_id', userId)
      .single();

    if (parentError || !parentTask) {
      return jsonWithCors(request, { error: 'Parent task not found' }, 404);
    }

    // Get all subtask IDs to verify they exist and belong to this parent
    const subtaskIds = reorderData.subtask_orders.map(item => item.task_id);
    
    const { data: subtasks, error: subtasksError } = await client
      .from('tasks')
      .select('id, parent_task_id')
      .in('id', subtaskIds)
      .eq('user_id', userId);

    if (subtasksError) {
      console.error('Database error:', subtasksError);
      return jsonWithCors(request, { error: 'Failed to verify subtasks' }, 500);
    }

    // Verify all subtasks exist and belong to the specified parent
    if (!subtasks || subtasks.length !== subtaskIds.length) {
      return jsonWithCors(request, { error: 'One or more subtasks not found' }, 404);
    }

    const invalidSubtasks = subtasks.filter(task => task.parent_task_id !== reorderData.parent_task_id);
    if (invalidSubtasks.length > 0) {
      return jsonWithCors(request, 
        { error: 'One or more tasks are not subtasks of the specified parent' }, 
        400
      );
    }

    // Perform the reordering using a transaction-like approach
    const updates = reorderData.subtask_orders.map(item => ({
      id: item.task_id,
      subtask_order: item.new_order,
      updated_at: new Date().toISOString()
    }));

    // Update each subtask's order
    let updatedCount = 0;
    
    for (const update of updates) {
      const { error: updateError } = await client
        .from('tasks')
        .update({
          subtask_order: update.subtask_order,
          updated_at: update.updated_at
        })
        .eq('id', update.id)
        .eq('user_id', userId); // Additional security check

      if (updateError) {
        console.error('Failed to update subtask order:', updateError);
        return jsonWithCors(request, 
          { error: `Failed to update order for task ${update.id}` }, 
          500
        );
      }
      
      updatedCount++;
    }

    console.log(`Successfully reordered ${updatedCount} subtasks`);
    
    return jsonWithCors(request, { 
      message: 'Subtasks reordered successfully',
      updated_count: updatedCount
    });

  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}