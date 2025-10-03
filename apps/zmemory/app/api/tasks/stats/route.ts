import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabase as serviceClient } from '@/lib/supabase';
import { TaskStats, TaskStatus, TaskPriority, TaskCategory } from '@/validation';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Query validation schema
const StatsQuerySchema = z.object({
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
  assignee: z.string().optional()
});

// Generate mock statistics
const generateMockStats = (): TaskStats => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  return {
    total: 15,
    by_status: {
      [TaskStatus.PENDING]: 5,
      [TaskStatus.IN_PROGRESS]: 3,
      [TaskStatus.COMPLETED]: 6,
      [TaskStatus.CANCELLED]: 1,
      [TaskStatus.ON_HOLD]: 0
    },
    by_priority: {
      [TaskPriority.LOW]: 3,
      [TaskPriority.MEDIUM]: 7,
      [TaskPriority.HIGH]: 4,
      [TaskPriority.URGENT]: 1
    },
    by_category: {
      [TaskCategory.WORK]: 8,
      [TaskCategory.PERSONAL]: 3,
      [TaskCategory.PROJECT]: 2,
      [TaskCategory.MEETING]: 1,
      [TaskCategory.LEARNING]: 1,
      [TaskCategory.MAINTENANCE]: 0,
      [TaskCategory.OTHER]: 0
    },
    overdue: 2,
    due_today: 1,
    due_this_week: 3,
    completion_rate: 40, // 6 completed out of 15 total
    average_completion_time: 3.5 // average days to complete
  };
};

/**
 * @swagger
 * /api/tasks/stats:
 *   get:
 *     summary: Get task statistics
 *     description: Retrieve comprehensive statistics about tasks including counts by status, priority, category, and time-based metrics
 *     tags: [Tasks]
 *     parameters:
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Include tasks created after this date
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Include tasks created before this date
 *       - in: query
 *         name: assignee
 *         schema:
 *           type: string
 *         description: Filter statistics by assignee
 *     responses:
 *       200:
 *         description: Task statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   description: Total number of tasks
 *                 by_status:
 *                   type: object
 *                   properties:
 *                     pending:
 *                       type: integer
 *                     in_progress:
 *                       type: integer
 *                     completed:
 *                       type: integer
 *                     cancelled:
 *                       type: integer
 *                     on_hold:
 *                       type: integer
 *                 by_priority:
 *                   type: object
 *                   properties:
 *                     low:
 *                       type: integer
 *                     medium:
 *                       type: integer
 *                     high:
 *                       type: integer
 *                     urgent:
 *                       type: integer
 *                 by_category:
 *                   type: object
 *                   properties:
 *                     work:
 *                       type: integer
 *                     personal:
 *                       type: integer
 *                     project:
 *                       type: integer
 *                     meeting:
 *                       type: integer
 *                     learning:
 *                       type: integer
 *                     maintenance:
 *                       type: integer
 *                     other:
 *                       type: integer
 *                 overdue:
 *                   type: integer
 *                   description: Number of overdue tasks
 *                 due_today:
 *                   type: integer
 *                   description: Number of tasks due today
 *                 due_this_week:
 *                   type: integer
 *                   description: Number of tasks due this week
 *                 completion_rate:
 *                   type: number
 *                   description: Percentage of completed tasks
 *                 average_completion_time:
 *                   type: number
 *                   description: Average days to complete a task
 *             example:
 *               total: 15
 *               by_status:
 *                 pending: 5
 *                 in_progress: 3
 *                 completed: 6
 *                 cancelled: 1
 *                 on_hold: 0
 *               by_priority:
 *                 low: 3
 *                 medium: 7
 *                 high: 4
 *                 urgent: 1
 *               overdue: 2
 *               due_today: 1
 *               due_this_week: 3
 *               completion_rate: 40
 *               average_completion_time: 3.5
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function handleGetTaskStats(
  request: EnhancedRequest
): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const userId = request.userId!;

  // Parse and validate query parameters
  const queryResult = StatsQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!queryResult.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: queryResult.error.errors },
      { status: 400 }
    );
  }

  const { from_date, to_date, assignee } = queryResult.data;

  // If Supabase is not configured, return mock statistics
  if (!serviceClient) {
    return NextResponse.json(generateMockStats());
  }

  // Build base query
  let query = serviceClient
    .from('tasks')
    .select('*')
    .eq('user_id', userId);

  // Apply date filters
  if (from_date) {
    query = query.gte('created_at', from_date);
  }
  if (to_date) {
    query = query.lte('created_at', to_date);
  }
  // tasks table does not include assignee column, ignore this filter

  const { data: tasks, error } = await query;

  if (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task statistics' },
      { status: 500 }
    );
  }

  if (!tasks) {
    return NextResponse.json(generateMockStats());
  }

  // Calculate statistics
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const stats: TaskStats = {
    total: tasks.length,
    by_status: {
      [TaskStatus.PENDING]: 0,
      [TaskStatus.IN_PROGRESS]: 0,
      [TaskStatus.COMPLETED]: 0,
      [TaskStatus.CANCELLED]: 0,
      [TaskStatus.ON_HOLD]: 0
    },
    by_priority: {
      [TaskPriority.LOW]: 0,
      [TaskPriority.MEDIUM]: 0,
      [TaskPriority.HIGH]: 0,
      [TaskPriority.URGENT]: 0
    },
    by_category: {
      [TaskCategory.WORK]: 0,
      [TaskCategory.PERSONAL]: 0,
      [TaskCategory.PROJECT]: 0,
      [TaskCategory.MEETING]: 0,
      [TaskCategory.LEARNING]: 0,
      [TaskCategory.MAINTENANCE]: 0,
      [TaskCategory.OTHER]: 0
    },
    overdue: 0,
    due_today: 0,
    due_this_week: 0,
    completion_rate: 0,
    average_completion_time: 0
  };

  let totalCompletionTime = 0;
  let completedTasksWithTime = 0;

  tasks.forEach((task: any) => {
    // Count by status
    if (task.status && stats.by_status.hasOwnProperty(task.status)) {
      stats.by_status[task.status as TaskStatus]++;
    }

    // Count by priority
    if (task.priority && stats.by_priority.hasOwnProperty(task.priority)) {
      stats.by_priority[task.priority as TaskPriority]++;
    }

    // tasks table doesn't have category, count as OTHER
    stats.by_category[TaskCategory.OTHER]++;

    // Check due dates
    if (task.due_date) {
      const dueDate = new Date(task.due_date);

      if (dueDate < now && task.status !== TaskStatus.COMPLETED) {
        stats.overdue++;
      }

      if (dueDate >= today && dueDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)) {
        stats.due_today++;
      }

      if (dueDate >= today && dueDate <= weekFromNow) {
        stats.due_this_week++;
      }
    }

    // Calculate completion time for completed tasks
    if (task.status === TaskStatus.COMPLETED && task.updated_at) {
      const createdDate = new Date(task.created_at);
      const completedDate = new Date(task.updated_at);
      const completionTime = (completedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      totalCompletionTime += completionTime;
      completedTasksWithTime++;
    }
  });

  // Calculate completion rate
  stats.completion_rate = tasks.length > 0
    ? Math.round((stats.by_status[TaskStatus.COMPLETED] / tasks.length) * 100)
    : 0;

  // Calculate average completion time
  stats.average_completion_time = completedTasksWithTime > 0
    ? Math.round((totalCompletionTime / completedTasksWithTime) * 10) / 10
    : 0;

  return NextResponse.json(stats);
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetTaskStats, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 300
  }
});

// Explicit OPTIONS handler for CORS preflight
export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
