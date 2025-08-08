import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { TaskStatus } from '../../../../../lib/task-types';

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Status update schema
const StatusUpdateSchema = z.object({
  status: z.enum([
    TaskStatus.PENDING,
    TaskStatus.IN_PROGRESS,
    TaskStatus.COMPLETED,
    TaskStatus.CANCELLED,
    TaskStatus.ON_HOLD
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
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    // Validate request body
    const validationResult = StatusUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid status update data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { status, notes, progress } = validationResult.data;
    const now = new Date().toISOString();

    // If Supabase is not configured, return mock response
    if (!supabase) {
      if (id === '1') {
        const mockTask = {
          id: '1',
          type: 'task',
          content: {
            title: 'Implement task management API',
            description: 'Create comprehensive REST API for task operations',
            status: status,
            priority: 'high',
            category: 'work',
            progress: progress !== undefined ? progress : (status === 'completed' ? 100 : 75),
            estimated_duration: 480,
            notes: notes || 'Status updated via API',
            completion_date: status === 'completed' ? now : undefined
          },
          tags: ['api', 'development', 'high-priority'],
          created_at: new Date(Date.now() - 86400000).toISOString(),
          updated_at: now
        };
        return NextResponse.json(mockTask);
      } else {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        );
      }
    }

    // First, get the existing task
    const { data: existingTask, error: fetchError } = await supabase
      .from('memories')
      .select('*')
      .eq('id', id)
      .eq('type', 'task')
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        );
      }
      console.error('Database error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch task' },
        { status: 500 }
      );
    }

    // Prepare updated content
    const updatedContent = {
      ...existingTask.content,
      status: status,
      updated_at: now
    };

    // Add notes if provided
    if (notes) {
      updatedContent.notes = notes;
    }

    // Update progress if provided, or auto-set based on status
    if (progress !== undefined) {
      updatedContent.progress = progress;
    } else if (status === TaskStatus.COMPLETED) {
      updatedContent.progress = 100;
    } else if (status === TaskStatus.PENDING) {
      updatedContent.progress = 0;
    }

    // Auto-set completion_date when status changes to completed
    if (status === TaskStatus.COMPLETED && !updatedContent.completion_date) {
      updatedContent.completion_date = now;
    }

    // Remove completion_date if status changes from completed to something else
    if (status !== TaskStatus.COMPLETED && updatedContent.completion_date) {
      delete updatedContent.completion_date;
    }

    const { data, error } = await supabase
      .from('memories')
      .update({
        content: updatedContent,
        updated_at: now
      })
      .eq('id', id)
      .eq('type', 'task')
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to update task status' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// OPTIONS - Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}