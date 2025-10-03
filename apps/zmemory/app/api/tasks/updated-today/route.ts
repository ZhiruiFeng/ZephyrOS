import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { getClientForAuthType } from '@/auth';
import { supabase as serviceClient } from '@/lib/config/supabase';
import { TaskMemory } from '@/validation';
import { nowUTC, convertFromTimezoneToUTC } from '@/lib/utils/time-utils';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Query validation schema
const UpdatedTodayQuerySchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'on_hold']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  category: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).default('100'),
  offset: z.string().regex(/^\d+$/).transform(Number).default('0'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  timezone: z.string().optional()
});

// Helper function to get start and end of a specific date in ISO format
function getTodayDateRangeForDate(dateStr: string, timezone: string) {
  try {
    const startOfDayInTZ = `${dateStr}T00:00:00`;
    const endOfDayInTZ = `${dateStr}T23:59:59.999`;

    const startUTC = convertFromTimezoneToUTC(startOfDayInTZ, timezone);
    const endUTC = convertFromTimezoneToUTC(endOfDayInTZ, timezone);

    return {
      start: startUTC,
      end: endUTC
    };

  } catch (error) {
    console.warn(`Failed to calculate date range for date "${dateStr}" in timezone "${timezone}":`, error);
    // Fallback to UTC interpretation
    return {
      start: `${dateStr}T00:00:00.000Z`,
      end: `${dateStr}T23:59:59.999Z`
    };
  }
}

// Helper function to get start and end of today in ISO format
function getTodayDateRange(timezone?: string) {
  if (timezone) {
    try {
      const now = new Date();

      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });

      const todayInTimezone = formatter.format(now); // Returns YYYY-MM-DD format

      const startOfDayInTZ = `${todayInTimezone}T00:00:00`;
      const endOfDayInTZ = `${todayInTimezone}T23:59:59.999`;

      const startUTC = convertFromTimezoneToUTC(startOfDayInTZ, timezone);
      const endUTC = convertFromTimezoneToUTC(endOfDayInTZ, timezone);

      return {
        start: startUTC,
        end: endUTC
      };

    } catch (error) {
      console.warn(`Failed to calculate date range for timezone "${timezone}":`, error);
    }
  }

  // Fallback to server local timezone
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);

  return {
    start: startOfToday.toISOString(),
    end: endOfToday.toISOString()
  };
}

// Mock data generator for tasks updated today
const generateMockTasksUpdatedToday = (timezone?: string): TaskMemory[] => {
  const todayRange = getTodayDateRange(timezone);
  const now = nowUTC();

  return [
    {
      id: '1',
      type: 'task',
      content: {
        title: 'Review pull request #123',
        description: 'Code review for new authentication feature',
        status: 'in_progress',
        priority: 'high',
        category: 'work',
        progress: 60,
        estimated_duration: 30,
        notes: 'Updated progress to 60% after initial review',
        subtask_order: 0,
        completion_behavior: 'manual',
        progress_calculation: 'manual'
      },
      tags: ['code-review', 'authentication', 'urgent'],
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: now
    },
    {
      id: '2',
      type: 'task',
      content: {
        title: 'Update project documentation',
        description: 'Add API documentation for new endpoints',
        status: 'completed',
        priority: 'medium',
        category: 'work',
        progress: 100,
        estimated_duration: 90,
        completion_date: now,
        notes: 'Documentation completed and reviewed',
        subtask_order: 0,
        completion_behavior: 'manual',
        progress_calculation: 'manual'
      },
      tags: ['documentation', 'api'],
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      updated_at: now
    }
  ];
};

/**
 * @swagger
 * /api/tasks/updated-today:
 *   get:
 *     summary: Get tasks updated today
 *     description: Retrieve all tasks that were updated today for statistical analysis purposes
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
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of tasks to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of tasks to skip
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering tasks (YYYY-MM-DD format). If not provided, defaults to today.
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering tasks (YYYY-MM-DD format). If not provided, defaults to today.
 *       - in: query
 *         name: timezone
 *         schema:
 *           type: string
 *         description: Timezone for date calculations (e.g., "America/New_York", "Asia/Shanghai"). If not provided, uses server timezone.
 *     responses:
 *       200:
 *         description: List of tasks updated today
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tasks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TaskMemory'
 *                 total:
 *                   type: integer
 *                   description: Total number of tasks updated today
 *                 date_range:
 *                   type: object
 *                   properties:
 *                     start:
 *                       type: string
 *                       format: date-time
 *                     end:
 *                       type: string
 *                       format: date-time
 *                   description: Date range used for filtering
 *             example:
 *               tasks:
 *                 - id: "1"
 *                   type: "task"
 *                   content:
 *                     title: "Review pull request #123"
 *                     status: "in_progress"
 *                     priority: "high"
 *                     progress: 60
 *                   tags: ["code-review", "authentication"]
 *                   updated_at: "2025-08-13T14:30:00Z"
 *               total: 1
 *               date_range:
 *                 start: "2025-08-13T00:00:00.000Z"
 *                 end: "2025-08-13T23:59:59.999Z"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function handleGetTasksUpdatedToday(
  request: EnhancedRequest
): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const userId = request.userId!;

  // Parse and validate query parameters
  const queryResult = UpdatedTodayQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!queryResult.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: queryResult.error.errors },
      { status: 400 }
    );
  }

  const { status, priority, category, limit, offset, start_date, end_date, timezone } = queryResult.data;

  // Use custom date range if provided, otherwise default to today
  let dateRange;
  if (start_date && end_date) {
    if (timezone) {
      let startUTC: string;
      let endUTC: string;

      if (start_date === end_date) {
        const dayRange = getTodayDateRangeForDate(start_date, timezone);
        startUTC = dayRange.start;
        endUTC = dayRange.end;
      } else {
        startUTC = convertFromTimezoneToUTC(
          start_date.includes('T') ? start_date : `${start_date}T00:00:00`,
          timezone
        );
        endUTC = convertFromTimezoneToUTC(
          end_date.includes('T') ? end_date : `${end_date}T23:59:59.999`,
          timezone
        );
      }

      dateRange = {
        start: startUTC,
        end: endUTC
      };
    } else {
      const start = start_date.includes('T') ? start_date : `${start_date}T00:00:00.000Z`;
      const end = end_date.includes('T') ? end_date : `${end_date}T23:59:59.999Z`;
      dateRange = {
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString()
      };
    }
  } else {
    dateRange = getTodayDateRange(timezone || undefined);
  }

  // If Supabase is not configured, return filtered mock data
  if (!serviceClient) {
    let tasks = generateMockTasksUpdatedToday(timezone || undefined);

    // Apply filters
    if (status) {
      tasks = tasks.filter(task => task.content.status === status);
    }
    if (priority) {
      tasks = tasks.filter(task => task.content.priority === priority);
    }
    if (category) {
      tasks = tasks.filter(task => task.content.category === category);
    }

    const paginatedTasks = tasks.slice(offset, offset + limit);

    return NextResponse.json({
      tasks: paginatedTasks,
      total: tasks.length,
      date_range: dateRange
    });
  }

  const client = await getClientForAuthType(request) || serviceClient;

  // Build Supabase query against tasks table for tasks updated today
  let dbQuery = client
    .from('tasks')
    .select(`
      *,
      is_ai_task,
      category:categories(id, name, color, icon)
    `)
    .eq('user_id', userId)
    .gte('updated_at', dateRange.start)
    .lte('updated_at', dateRange.end);

  // Apply filters
  if (status) {
    dbQuery = dbQuery.eq('status', status);
  }
  if (priority) {
    dbQuery = dbQuery.eq('priority', priority);
  }
  if (category) {
    dbQuery = dbQuery.eq('category_id', category);
  }

  // Apply sorting and pagination
  dbQuery = dbQuery
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error } = await dbQuery;

  if (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks updated today' }, { status: 500 });
  }

  // Get total count for pagination info
  let countQuery = client
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('updated_at', dateRange.start)
    .lte('updated_at', dateRange.end);

  if (status) {
    countQuery = countQuery.eq('status', status);
  }
  if (priority) {
    countQuery = countQuery.eq('priority', priority);
  }
  if (category) {
    countQuery = countQuery.eq('category_id', category);
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    console.error('Count query error:', countError);
  }

  // Map tasks rows to TaskMemory shape for compatibility
  const mappedTasks = (data || []).map((row: any) => ({
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
    },
    tags: row.tags || [],
    created_at: row.created_at,
    updated_at: row.updated_at,
    category_id: row.category_id,
    is_ai_task: row.is_ai_task,
  }));

  return NextResponse.json({
    tasks: mappedTasks,
    total: count || mappedTasks.length,
    date_range: dateRange
  });
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetTasksUpdatedToday, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 300
  }
});

// Explicit OPTIONS handler for CORS preflight
export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
