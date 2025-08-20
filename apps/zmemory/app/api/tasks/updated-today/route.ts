import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createClientForRequest, getUserIdFromRequest } from '../../../../lib/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '../../../../lib/security';
import { TaskMemory } from '../../../../lib/task-types';

// Create Supabase client (service key only for mock fallback; real requests use bearer token)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Helper function to get start and end of today in ISO format
function getTodayDateRange() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);
  
  return {
    start: startOfToday.toISOString(),
    end: endOfToday.toISOString()
  };
}

// Mock data generator for tasks updated today
const generateMockTasksUpdatedToday = (): TaskMemory[] => {
  const todayRange = getTodayDateRange();
  const now = new Date().toISOString();
  
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
        notes: 'Updated progress to 60% after initial review'
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
        notes: 'Documentation completed and reviewed'
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
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Use custom date range if provided, otherwise default to today
    let dateRange;
    if (startDate && endDate) {
      // If start_date and end_date are provided, use them directly
      // They can be either date strings (YYYY-MM-DD) or full ISO strings
      const start = startDate.includes('T') ? startDate : `${startDate}T00:00:00.000Z`;
      const end = endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`;
      dateRange = {
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString()
      };
    } else {
      dateRange = getTodayDateRange();
    }

    // If Supabase is not configured, return filtered mock data
    if (!supabase) {
      let tasks = generateMockTasksUpdatedToday();

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

      // Apply pagination
      const paginatedTasks = tasks.slice(offset, offset + limit);

      return jsonWithCors(request, {
        tasks: paginatedTasks,
        total: tasks.length,
        date_range: dateRange
      });
    }

    // Enforce auth
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = createClientForRequest(request) || supabase;

    // Build Supabase query against tasks table for tasks updated today
    let dbQuery = client
      .from('tasks')
      .select(`
        *,
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

    // Apply sorting by updated_at descending (most recently updated first)
    dbQuery = dbQuery.order('updated_at', { ascending: false });

    // Apply pagination
    dbQuery = dbQuery.range(offset, offset + limit - 1);

    const { data, error } = await dbQuery;

    if (error) {
      console.error('Database error:', error);
      return jsonWithCors(request, { error: 'Failed to fetch tasks updated today' }, 500);
    }

    // Get total count for pagination info
    let countQuery = client
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('updated_at', dateRange.start)
      .lte('updated_at', dateRange.end);

    // Apply same filters for count
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
      // Continue with partial data if count fails
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
      // surface category_id for frontend filtering
      category_id: row.category_id,
    }));

    return jsonWithCors(request, {
      tasks: mappedTasks,
      total: count || mappedTasks.length,
      date_range: dateRange
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