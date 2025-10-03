import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { getClientForAuthType } from '@/auth';
import { TaskMemory } from '@/validation';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

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
async function handleGetTaskTree(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  // Parse and validate query parameters
  const queryResult = TreeQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!queryResult.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: queryResult.error.errors },
      { status: 400 }
    );
  }

  const query = queryResult.data;
  const { id: taskId } = await params;
  const userId = request.userId!;

  // Validate task ID format
  if (!/^[0-9a-fA-F-]{36}$/.test(taskId)) {
    return NextResponse.json({ error: 'Invalid task ID format' }, { status: 400 });
  }

  const client = await getClientForAuthType(request);
  if (!client) {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }

  // First verify the task exists and belongs to the user
  const { data: rootTask, error: rootError } = await client
    .from('tasks')
    .select('id')
    .eq('id', taskId)
    .eq('user_id', userId)
    .single();

  if (rootError || !rootTask) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // Use the database function to get complete subtask tree
  const { data: subtaskTree, error: treeError } = await client
    .rpc('get_subtask_tree', {
      root_task_id: taskId,
      max_depth: query.max_depth
    });

  if (treeError) {
    console.error('Database error:', treeError);
    return NextResponse.json({ error: 'Failed to fetch task tree' }, { status: 500 });
  }

  // Get full task details for each task in the tree
  const taskIds = (subtaskTree || []).map((node: any) => node.task_id);

  if (taskIds.length === 0) {
    return NextResponse.json(query.format === 'tree' ? null : []);
  }

  const { data: taskDetails, error: detailsError } = await client
    .from('tasks')
    .select(`
      *,
      is_ai_task,
      category:categories(id, name, color, icon)
    `)
    .in('id', taskIds)
    .eq('user_id', userId);

  if (detailsError) {
    console.error('Database error:', detailsError);
    return NextResponse.json({ error: 'Failed to fetch task details' }, { status: 500 });
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
    is_ai_task: row.is_ai_task,
  }));

  // Filter out completed tasks if requested
  if (!query.include_completed) {
    tasks = tasks.filter(task => task.content.status !== 'completed');
  }

  // Sort by hierarchy path to maintain proper parent-child relationships
  tasks.sort((a, b) => {
    const pathA = a.hierarchy_path || '';
    const pathB = b.hierarchy_path || '';

    // Split paths into components
    const componentsA = pathA.split('/').filter(Boolean);
    const componentsB = pathB.split('/').filter(Boolean);

    // Compare path components level by level
    const minLength = Math.min(componentsA.length, componentsB.length);
    for (let i = 0; i < minLength; i++) {
      if (componentsA[i] !== componentsB[i]) {
        // At this level, sort by subtask_order within the same parent
        const taskA = tasks.find(t => t.id === componentsA[i]);
        const taskB = tasks.find(t => t.id === componentsB[i]);
        const orderA = taskA?.content.subtask_order || 0;
        const orderB = taskB?.content.subtask_order || 0;
        return orderA - orderB;
      }
    }

    // If one path is a prefix of another, shorter path comes first
    if (componentsA.length !== componentsB.length) {
      return componentsA.length - componentsB.length;
    }

    // Fallback to subtask_order if paths are identical (shouldn't happen)
    return (a.content.subtask_order || 0) - (b.content.subtask_order || 0);
  });

  // Return based on requested format
  if (query.format === 'tree') {
    const treeStructure = buildTaskTree(tasks, taskId);
    return NextResponse.json(treeStructure);
  } else {
    return NextResponse.json(tasks);
  }
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetTaskTree, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 300
  }
});

// Explicit OPTIONS handler for CORS preflight
export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
