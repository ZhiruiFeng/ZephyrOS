import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UpdateTaskSchema, TaskMemory } from '../../../../lib/task-types';

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: Get a specific task by ID
 *     description: Retrieve detailed information about a specific task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaskMemory'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // If Supabase is not configured, return mock data
    if (!supabase) {
      if (id === '1') {
        const mockTask: TaskMemory = {
          id: '1',
          type: 'task',
          content: {
            title: 'Implement task management API',
            description: 'Create comprehensive REST API for task operations',
            status: 'in_progress',
            priority: 'high',
            category: 'work',
            progress: 75,
            estimated_duration: 480,
            notes: 'Making good progress on the implementation'
          },
          tags: ['api', 'development', 'high-priority'],
          created_at: new Date(Date.now() - 86400000).toISOString(),
          updated_at: new Date().toISOString()
        };
        return NextResponse.json(mockTask);
      } else {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        );
      }
    }

    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('id', id)
      .eq('type', 'task')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        );
      }
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch task' },
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

/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     summary: Update a specific task
 *     description: Update task details including status, priority, content, etc.
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
 *             $ref: '#/components/schemas/UpdateTaskRequest'
 *           example:
 *             content:
 *               status: "completed"
 *               progress: 100
 *               completion_date: "2024-08-03T14:30:00Z"
 *               notes: "Successfully completed the implementation"
 *     responses:
 *       200:
 *         description: Task updated successfully
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
    const validationResult = UpdateTaskSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid task data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;
    const now = new Date().toISOString();

    // If Supabase is not configured, return mock response
    if (!supabase) {
      if (id === '1') {
        const mockTask: TaskMemory = {
          id: '1',
          type: 'task',
          content: {
            title: 'Implement task management API',
            description: 'Create comprehensive REST API for task operations',
            status: 'completed',
            priority: 'high',
            category: 'work',
            progress: 100,
            estimated_duration: 480,
            completion_date: now,
            notes: updateData.content?.notes || 'Successfully completed the implementation'
          },
          tags: updateData.tags || ['api', 'development', 'high-priority'],
          metadata: updateData.metadata,
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

    // Merge the existing content with updates
    const updatedContent = updateData.content 
      ? { ...existingTask.content, ...updateData.content }
      : existingTask.content;

    // Auto-set completion_date when status changes to completed
    if (updateData.content?.status === 'completed' && !updateData.content?.completion_date) {
      updatedContent.completion_date = now;
      updatedContent.progress = 100;
    }

    // Prepare update object
    const updateObject: any = {
      updated_at: now
    };

    if (updateData.content) {
      updateObject.content = updatedContent;
    }
    if (updateData.tags !== undefined) {
      updateObject.tags = updateData.tags;
    }
    if (updateData.metadata !== undefined) {
      updateObject.metadata = updateData.metadata;
    }

    const { data, error } = await supabase
      .from('memories')
      .update(updateObject)
      .eq('id', id)
      .eq('type', 'task')
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to update task' },
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

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Delete a specific task
 *     description: Permanently delete a task from the system
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Task deleted successfully"
 *                 id:
 *                   type: string
 *                   example: "123e4567-e89b-12d3-a456-426614174000"
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // If Supabase is not configured, return mock response
    if (!supabase) {
      if (id === '1') {
        return NextResponse.json({
          message: 'Task deleted successfully',
          id: id
        });
      } else {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        );
      }
    }

    const { error } = await supabase
      .from('memories')
      .delete()
      .eq('id', id)
      .eq('type', 'task');

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to delete task' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Task deleted successfully',
      id: id
    });
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}