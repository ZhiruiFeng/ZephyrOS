import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/lib/middleware';
import { createTaskService } from '@/lib/services';
import { CreateTaskSchema, TaskQuerySchema, TaskMemory } from '@/validation';
import { convertSearchParamsToUTC } from '@/lib/utils/time-utils';
import type { Task } from '@/database/repositories/task-repository';

/**
 * Helper function to map Task entity to TaskMemory format for API responses
 * Maintains backward compatibility with existing frontend code
 */
function mapTaskToTaskMemory(task: Task & { category?: { name: string } }): TaskMemory {
  return {
    id: task.id,
    type: 'task' as const,
    content: {
      title: task.content.title,
      description: task.content.description || undefined,
      status: task.content.status,
      priority: task.content.priority,
      category: (task as any).category?.name,
      category_id: task.content.category_id || undefined,
      due_date: task.content.due_date || undefined,
      estimated_duration: task.content.estimated_duration || undefined,
      progress: task.content.progress || 0,
      assignee: task.content.assignee || undefined,
      completion_date: task.content.completion_date || undefined,
      notes: task.content.notes || undefined,
      // Include subtasks hierarchy fields
      parent_task_id: task.content.parent_task_id || undefined,
      subtask_order: task.content.subtask_order || 0,
      completion_behavior: task.content.completion_behavior || 'manual',
      progress_calculation: task.content.progress_calculation || 'manual',
    },
    tags: task.tags || [],
    created_at: task.created_at,
    updated_at: task.updated_at,
    // Surface additional fields for frontend
    category_id: task.content.category_id,
    hierarchy_level: task.hierarchy_level,
    hierarchy_path: task.hierarchy_path,
    subtask_count: task.subtask_count || 0,
    completed_subtask_count: (task as any).completed_subtask_count || 0,
  } as any;
}

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Get tasks with optional filtering
 *     description: Retrieve tasks with support for filtering by status, priority, category, assignee, and more
 *     tags: [Tasks]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, completed, cancelled, on_hold]
 *         description: Filter by task status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         description: Filter by task priority
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [work, personal, project, meeting, learning, maintenance, other]
 *         description: Filter by task category
 *       - in: query
 *         name: assignee
 *         schema:
 *           type: string
 *         description: Filter by assignee
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Filter by tags (comma-separated)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *       - in: query
 *         name: due_before
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Tasks due before this date
 *       - in: query
 *         name: due_after
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Tasks due after this date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of tasks to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of tasks to skip
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [created_at, updated_at, due_date, priority, title]
 *           default: created_at
 *         description: Field to sort by
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TaskMemory'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function handleGet(request: EnhancedRequest) {
  const userId = request.userId!;
  const query = request.validatedQuery;

  // Convert any date parameters to UTC for database queries
  const utcQuery = convertSearchParamsToUTC(query, undefined, query.timezone);

  // Create service and fetch tasks with filters
  const service = createTaskService({ userId });
  const result = await service.findTasks(utcQuery);

  if (result.error) throw result.error;

  // Map Task entities to TaskMemory format for API response
  const tasks = (result.data || []).map(mapTaskToTaskMemory);

  return NextResponse.json(tasks);
}

export const GET = withStandardMiddleware(handleGet, {
  validation: { querySchema: TaskQuerySchema },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 300 }
});

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     description: Create a new task memory with comprehensive task data
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTaskRequest'
 *           example:
 *             type: "task"
 *             content:
 *               title: "Implement user authentication"
 *               description: "Add JWT-based authentication system"
 *               status: "pending"
 *               priority: "high"
 *               category: "work"
 *               due_date: "2024-08-15T17:00:00Z"
 *               estimated_duration: 480
 *             tags: ["authentication", "security", "backend"]
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaskMemory'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function handlePost(request: EnhancedRequest) {
  const userId = request.userId!;
  const taskData = request.validatedBody;

  // Create service and handle task creation
  const service = createTaskService({ userId });

  // Transform CreateTaskSchema format to Task entity format
  const taskInput: Partial<Task> = {
    content: {
      title: taskData.content.title,
      description: taskData.content.description,
      status: taskData.content.status,
      priority: taskData.content.priority,
      category_id: taskData.content.category_id,
      due_date: taskData.content.due_date,
      estimated_duration: taskData.content.estimated_duration,
      progress: taskData.content.progress,
      assignee: taskData.content.assignee,
      notes: taskData.content.notes,
      parent_task_id: taskData.content.parent_task_id,
      subtask_order: taskData.content.subtask_order,
      completion_behavior: taskData.content.completion_behavior,
      progress_calculation: taskData.content.progress_calculation,
      completion_date: taskData.content.completion_date,
    },
    tags: taskData.tags,
    metadata: {
      // Pass category name in metadata for service-level lookup
      category: taskData.content.category,
      ...taskData.metadata
    }
  };

  const result = await service.createTask(taskInput);

  if (result.error) throw result.error;
  if (!result.data) throw new Error('Failed to create task');

  // Map created task to TaskMemory format
  const createdTask = mapTaskToTaskMemory(result.data);

  return NextResponse.json(createdTask, { status: 201 });
}

export const POST = withStandardMiddleware(handlePost, {
  validation: { bodySchema: CreateTaskSchema },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 50 }
});

export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
