import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClientForRequest, getUserIdFromRequest } from '../../../../lib/auth';
import { UpdateTaskSchema, TaskMemory } from '../../../../lib/task-types';

// Helper function to get category ID by name
async function getCategoryIdByName(categoryName: string): Promise<string | null> {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .eq('name', categoryName)
    .single();
    
  if (error || !data) return null;
  return data.id;
}

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
            notes: 'Making good progress on the implementation',
            subtask_order: 0,
            completion_behavior: 'manual',
            progress_calculation: 'manual'
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

    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const client = createClientForRequest(request) || supabase

    const { data, error } = await client
      .from('tasks')
      .select(`
        *,
        is_ai_task,
        category:categories(id, name, color, icon)
      `)
      .eq('id', id)
      .eq('user_id', userId)
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

    return NextResponse.json({
      id: data.id,
      type: 'task',
      content: {
        title: data.title,
        description: data.description || undefined,
        status: data.status,
        priority: data.priority,
        category: data.category?.name,
        due_date: data.due_date || undefined,
        estimated_duration: data.estimated_duration || undefined,
        progress: data.progress || 0,
        assignee: data.assignee || undefined,
        completion_date: data.completion_date || undefined,
        notes: data.notes || undefined,
        // Include subtasks hierarchy fields
        parent_task_id: data.parent_task_id || undefined,
        subtask_order: data.subtask_order || 0,
        completion_behavior: data.completion_behavior || 'manual',
        progress_calculation: data.progress_calculation || 'manual',
      },
      tags: data.tags || [],
      created_at: data.created_at,
      updated_at: data.updated_at,
      // Surface additional fields for frontend
      category_id: data.category_id,
      hierarchy_level: data.hierarchy_level,
      hierarchy_path: data.hierarchy_path,
      subtask_count: data.subtask_count || 0,
      completed_subtask_count: data.completed_subtask_count || 0,
    });
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    
    // Validate request body
    const validationResult = UpdateTaskSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error.errors);
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
            notes: updateData.content?.notes || 'Successfully completed the implementation',
            subtask_order: 0,
            completion_behavior: 'manual',
            progress_calculation: 'manual'
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
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const client = createClientForRequest(request) || supabase

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
      console.error('Database error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch task' },
        { status: 500 }
      );
    }

    // Merge the existing content with updates
    // Prepare update object mapped to tasks columns
    const updateObject: any = { updated_at: now };
    if (updateData.content) {
      if (updateData.content.title !== undefined) updateObject.title = updateData.content.title;
      if (updateData.content.description !== undefined) updateObject.description = updateData.content.description;
      if (updateData.content.status !== undefined) updateObject.status = updateData.content.status;
      if (updateData.content.priority !== undefined) updateObject.priority = updateData.content.priority;
      if (updateData.content.category !== undefined) {
        updateObject.category_id = updateData.content.category ? await getCategoryIdByName(updateData.content.category) : null;
      }
      if (updateData.content.category_id !== undefined) {
        updateObject.category_id = updateData.content.category_id || null;
      }
      if (updateData.content.due_date !== undefined) updateObject.due_date = updateData.content.due_date;
      if (updateData.content.estimated_duration !== undefined) updateObject.estimated_duration = updateData.content.estimated_duration;
      if (updateData.content.progress !== undefined) updateObject.progress = updateData.content.progress;
      if (updateData.content.assignee !== undefined) updateObject.assignee = updateData.content.assignee;
      if (updateData.content.completion_date !== undefined) updateObject.completion_date = updateData.content.completion_date;
      // Auto set/clear completion_date based on status transition
      if (updateData.content.status === 'completed' && updateObject.completion_date === undefined) {
        updateObject.completion_date = now;
        if (updateObject.progress === undefined) updateObject.progress = 100;
      }
      if (updateData.content.status && updateData.content.status !== 'completed') {
        updateObject.completion_date = null;
      }
      if (updateData.content.notes !== undefined) updateObject.notes = updateData.content.notes;
      
      // Handle subtasks hierarchy fields
      if (updateData.content.parent_task_id !== undefined) updateObject.parent_task_id = updateData.content.parent_task_id;
      if (updateData.content.subtask_order !== undefined) updateObject.subtask_order = updateData.content.subtask_order;
      if (updateData.content.completion_behavior !== undefined) updateObject.completion_behavior = updateData.content.completion_behavior;
      if (updateData.content.progress_calculation !== undefined) updateObject.progress_calculation = updateData.content.progress_calculation;
    }
    if (updateData.tags !== undefined) {
      updateObject.tags = updateData.tags;
    }
    
    const { data, error } = await client
      .from('tasks')
      .update(updateObject)
      .eq('id', id)
      .eq('user_id', userId)
      .select(`
        *,
        is_ai_task,
        category:categories(id, name, color, icon)
      `)
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to update task', details: error },
        { status: 500 }
      );
    }

    const responseData = {
      id: data.id,
      type: 'task',
      content: {
        title: data.title,
        description: data.description || undefined,
        status: data.status,
        priority: data.priority,
        category: data.category?.name,
        due_date: data.due_date || undefined,
        estimated_duration: data.estimated_duration || undefined,
        progress: data.progress || 0,
        assignee: data.assignee || undefined,
        completion_date: data.completion_date || undefined,
        notes: data.notes || undefined,
        // Include subtasks hierarchy fields
        parent_task_id: data.parent_task_id || undefined,
        subtask_order: data.subtask_order || 0,
        completion_behavior: data.completion_behavior || 'manual',
        progress_calculation: data.progress_calculation || 'manual',
      },
      tags: data.tags || [],
      created_at: data.created_at,
      updated_at: data.updated_at,
      // Surface additional fields for frontend
      category_id: data.category_id,
      hierarchy_level: data.hierarchy_level,
      hierarchy_path: data.hierarchy_path,
      subtask_count: data.subtask_count || 0,
      completed_subtask_count: data.completed_subtask_count || 0,
    };
    
    const response = NextResponse.json(responseData);
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const taskId = id;

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

    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const client = createClientForRequest(request) || supabase

    const { error } = await client
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

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