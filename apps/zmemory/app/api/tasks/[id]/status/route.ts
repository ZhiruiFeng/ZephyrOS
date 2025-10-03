import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabase as serviceClient } from '@/lib/supabase';
import { getClientForAuthType } from '@/auth';
import { z } from 'zod';
import { TaskStatus } from '@/validation';

export const dynamic = 'force-dynamic';

// Status update schema (allow all status)
const StatusUpdateSchema = z.object({
  status: z.enum([
    TaskStatus.PENDING,
    TaskStatus.IN_PROGRESS,
    TaskStatus.COMPLETED,
    TaskStatus.CANCELLED,
    TaskStatus.ON_HOLD,
  ]),
  notes: z.string().optional(),
  progress: z.number().min(0).max(100).optional()
});

/**
 * @swagger
 * /api/tasks/{id}/status:
 *   put:
 *     summary: Update task status
 *     description: Update the status of a specific task with optional progress and notes
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed, cancelled, on_hold]
 *                 description: New status for the task
 *               notes:
 *                 type: string
 *                 description: Optional notes about the status change
 *               progress:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Task completion progress (0-100)
 *           example:
 *             status: "completed"
 *             notes: "All requirements have been implemented and tested"
 *             progress: 100
 *     responses:
 *       200:
 *         description: Task status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaskMemory'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function handleUpdateTaskStatus(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const userId = request.userId!;
  const { status, notes, progress } = request.validatedBody!;
  const client = await getClientForAuthType(request) || serviceClient;

  if (!client) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const now = new Date().toISOString();

  // First, get the existing task
  const { data: existingTask, error: fetchError } = await client
    .from('tasks')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }

  // Prepare updated content
  const updateObject: any = { status, updated_at: now };
  if (status === TaskStatus.COMPLETED) {
    updateObject.completion_date = now;
    if (progress === undefined) {
      updateObject.progress = 100;
    }
  }
  if (progress !== undefined) {
    updateObject.progress = progress;
  }
  if (notes !== undefined) {
    updateObject.description = existingTask.description
      ? `${existingTask.description}\n${notes}`
      : notes;
  }

  const { data, error } = await client
    .from('tasks')
    .update(updateObject)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'Failed to update task status' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    id: data.id,
    type: 'task',
    content: {
      title: data.title,
      description: data.description || undefined,
      status: data.status,
      priority: data.priority,
      due_date: data.due_date || undefined,
    },
    tags: data.tags || [],
    created_at: data.created_at,
    updated_at: data.updated_at,
  });
}

// Apply middleware
export const PUT = withStandardMiddleware(handleUpdateTaskStatus, {
  validation: {
    bodySchema: StatusUpdateSchema
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
  }
});

// Explicit OPTIONS handler for CORS preflight
export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
