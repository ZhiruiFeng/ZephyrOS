import { NextRequest, NextResponse } from 'next/server';
import { createClientForRequest, getUserIdFromRequest } from '../../../../../lib/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '../../../../../lib/security';
import { TaskMemory, SubtaskTreeNode } from '../../../../../lib/task-types';
import { z } from 'zod';

// Query validation schema
const TreeQuerySchema = z.object({
  max_depth: z.string().regex(/^\d+$/).transform(Number).default('5'),
  include_completed: z.enum(['true', 'false']).transform(val => val === 'true').default('true'),
  format: z.enum(['tree', 'flat']).default('flat') // tree = nested structure, flat = flat list
});

interface TaskWithSubtasks extends TaskMemory {
  subtasks?: TaskWithSubtasks[];
}

// Build nested tree structure from flat list
function buildTaskTree(flatTasks: TaskMemory[], rootTaskId: string): TaskWithSubtasks | null {
  const taskMap = new Map<string, TaskWithSubtasks>();
  
  // Create map of all tasks
  flatTasks.forEach(task => {
    taskMap.set(task.id, { ...task, subtasks: [] });
  });
  
  // Find root task
  const rootTask = taskMap.get(rootTaskId);
  if (!rootTask) return null;
  
  // Build parent-child relationships
  flatTasks.forEach(task => {
    if (task.content.parent_task_id && task.id !== rootTaskId) {
      const parent = taskMap.get(task.content.parent_task_id);
      const child = taskMap.get(task.id);
      if (parent && child) {
        parent.subtasks = parent.subtasks || [];
        parent.subtasks.push(child);
      }
    }
  });
  
  // Sort subtasks by order
  function sortSubtasks(task: TaskWithSubtasks) {
    if (task.subtasks) {
      task.subtasks.sort((a, b) => (a.content.subtask_order || 0) - (b.content.subtask_order || 0));
      task.subtasks.forEach(sortSubtasks);
    }
  }
  
  sortSubtasks(rootTask);
  return rootTask;
}

/**
 * @swagger
 * /api/tasks/{id}/tree:
 *   get:
 *     summary: Get complete task tree for a task
 *     description: Retrieve the complete hierarchical task tree starting from a task (including the task itself and all its subtasks)
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the root task
 *       - in: query
 *         name: max_depth
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Maximum depth of subtasks to retrieve
 *       - in: query
 *         name: include_completed
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Whether to include completed subtasks
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [tree, flat]
 *           default: flat
 *         description: Response format - 'tree' for nested structure, 'flat' for flat list
 *     responses:
 *       200:
 *         description: Task tree
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/TaskMemory'
 *                 - type: array
 *                   items:
 *                     $ref: '#/components/schemas/TaskMemory'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         description: Task not found
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const { searchParams } = new URL(request.url);
    
    // Parse and validate query parameters
    const queryResult = TreeQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!queryResult.success) {
      return jsonWithCors(request, 
        { error: 'Invalid query parameters', details: queryResult.error.errors }, 
        400
      );
    }

    const query = queryResult.data;
    const taskId = params.id;

    // Validate task ID format
    if (!/^[0-9a-fA-F-]{36}$/.test(taskId)) {
      return jsonWithCors(request, { error: 'Invalid task ID format' }, 400);
    }

    // Enforce auth
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = createClientForRequest(request);
    if (!client) {
      return jsonWithCors(request, { error: 'Database connection failed' }, 500);
    }

    // First verify the task exists and belongs to the user
    const { data: rootTask, error: rootError } = await client
      .from('tasks')
      .select('id')
      .eq('id', taskId)
      .eq('user_id', userId)
      .single();

    if (rootError || !rootTask) {
      return jsonWithCors(request, { error: 'Task not found' }, 404);
    }

    // Use the database function to get complete subtask tree
    const { data: subtaskTree, error: treeError } = await client
      .rpc('get_subtask_tree', {
        root_task_id: taskId,
        max_depth: query.max_depth
      });

    if (treeError) {
      console.error('Database error:', treeError);
      return jsonWithCors(request, { error: 'Failed to fetch task tree' }, 500);
    }

    // Get full task details for each task in the tree
    const taskIds = (subtaskTree || []).map((node: SubtaskTreeNode) => node.task_id);
    
    if (taskIds.length === 0) {
      return jsonWithCors(request, query.format === 'tree' ? null : []);
    }

    const { data: taskDetails, error: detailsError } = await client
      .from('tasks')
      .select(`
        *,
        category:categories(id, name, color, icon)
      `)
      .in('id', taskIds)
      .eq('user_id', userId);

    if (detailsError) {
      console.error('Database error:', detailsError);
      return jsonWithCors(request, { error: 'Failed to fetch task details' }, 500);
    }

    // Map to TaskMemory format
    let tasks: TaskMemory[] = (taskDetails || []).map((row: any) => ({
      id: row.id,
      type: 'task' as const,
      content: {
        title: row.title,
        description: row.description || undefined,
        status: row.status,
        priority: row.priority,
        category: row.category?.name,
        due_date: row.due_date || undefined,
        estimated_duration: row.estimated_duration || undefined,
        progress: row.progress || 0,
        assignee: row.assignee || undefined,
        completion_date: row.completion_date || undefined,
        notes: row.notes || undefined,
        parent_task_id: row.parent_task_id || undefined,
        subtask_order: row.subtask_order || 0,
        completion_behavior: row.completion_behavior || 'manual',
        progress_calculation: row.progress_calculation || 'manual',
      },
      tags: row.tags || [],
      created_at: row.created_at,
      updated_at: row.updated_at,
      category_id: row.category_id,
      hierarchy_level: row.hierarchy_level,
      hierarchy_path: row.hierarchy_path,
      subtask_count: row.subtask_count || 0,
      completed_subtask_count: row.completed_subtask_count || 0,
    }));

    // Filter out completed tasks if requested
    if (!query.include_completed) {
      tasks = tasks.filter(task => task.content.status !== 'completed');
    }

    // Sort by hierarchy and order
    tasks.sort((a, b) => {
      if (a.hierarchy_level !== b.hierarchy_level) {
        return (a.hierarchy_level || 0) - (b.hierarchy_level || 0);
      }
      return (a.content.subtask_order || 0) - (b.content.subtask_order || 0);
    });

    // Return based on requested format
    if (query.format === 'tree') {
      const treeStructure = buildTaskTree(tasks, taskId);
      return jsonWithCors(request, treeStructure);
    } else {
      return jsonWithCors(request, tasks);
    }

  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}