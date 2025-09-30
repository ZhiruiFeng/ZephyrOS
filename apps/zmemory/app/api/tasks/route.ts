import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getUserIdFromRequest, getAuthContext, getClientForAuthType } from '@/lib/auth/index';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '@/lib/security';
import {
  CreateTaskSchema,
  TaskQuerySchema,
  TaskMemory,
  TaskStatus,
  TaskPriority,
  TaskCategory
} from '@/validation';
import { nowUTC, convertSearchParamsToUTC } from '@/lib/time-utils';

// Helper function to get category ID by name for current user
async function getCategoryIdByName(client: SupabaseClient, userId: string, categoryName: string): Promise<string | null> {
  const { data, error } = await client
    .from('categories')
    .select('id')
    .eq('name', categoryName)
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return data.id;
}

// Create Supabase client (service key only for mock fallback; real requests use bearer token)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Mock data for when Supabase is not configured
const generateMockTasks = (): TaskMemory[] => [
  {
    id: '1',
    type: 'task',
    content: {
      title: 'Implement task management API',
      description: 'Create comprehensive REST API for task operations',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      category: TaskCategory.WORK,
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
  },
  {
    id: '2',
    type: 'task',
    content: {
      title: 'Review project documentation',
      description: 'Go through all project docs and ensure they are up to date',
      status: TaskStatus.PENDING,
      priority: TaskPriority.MEDIUM,
      category: TaskCategory.WORK,
      progress: 0,
      due_date: new Date(Date.now() + 172800000).toISOString(),
      estimated_duration: 120,
      subtask_order: 0,
      completion_behavior: 'manual',
      progress_calculation: 'manual'
    },
    tags: ['documentation', 'review'],
    created_at: new Date(Date.now() - 43200000).toISOString(),
    updated_at: new Date(Date.now() - 43200000).toISOString()
  },
  {
    id: '3',
    type: 'task',
    content: {
      title: 'Learn Next.js 15 features',
      description: 'Study new features in Next.js 15',
      status: TaskStatus.COMPLETED,
      priority: TaskPriority.LOW,
      category: TaskCategory.LEARNING,
      progress: 100,
      completion_date: new Date(Date.now() - 7200000).toISOString(),
      estimated_duration: 240,
      subtask_order: 0,
      completion_behavior: 'manual',
      progress_calculation: 'manual'
    },
    tags: ['learning', 'nextjs', 'frontend'],
    created_at: new Date(Date.now() - 259200000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString()
  }
];

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
export async function GET(request: NextRequest) {
  try {
    console.log('[TASKS] ========== NEW REQUEST ==========')
    console.log('[TASKS] Request URL:', request.url)
    console.log('[TASKS] Authorization header:', request.headers.get('authorization') ? 'PRESENT (Bearer ' + request.headers.get('authorization')?.substring(7, 17) + '...)' : 'MISSING')
    console.log('[TASKS] Environment:', process.env.NODE_ENV)

    // Rate limiting - more permissive for GET requests
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 300)) { // 300 requests per 15 minutes
      console.error('[TASKS] Rate limit exceeded for IP:', clientIP)
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const { searchParams } = new URL(request.url);
    
    // Parse and validate query parameters
    const queryResult = TaskQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryResult.error.errors },
        { status: 400 }
      );
    }

    const query = queryResult.data;
    
    // Convert any date parameters to UTC for database queries
    // If timezone is provided, convert from that timezone; otherwise assume local time
    const utcQuery = convertSearchParamsToUTC(query, undefined, query.timezone);

    // If Supabase is not configured, return filtered mock data
    if (!supabase) {
      let tasks = generateMockTasks();

      // Apply filters
      if (query.status) {
        tasks = tasks.filter(task => task.content.status === query.status);
      }
      if (query.priority) {
        tasks = tasks.filter(task => task.content.priority === query.priority);
      }
      if (query.category) {
        tasks = tasks.filter(task => task.content.category === query.category);
      }
      if (query.search) {
        const searchLower = query.search.toLowerCase();
        tasks = tasks.filter(task => 
          task.content.title.toLowerCase().includes(searchLower) ||
          (task.content.description && task.content.description.toLowerCase().includes(searchLower))
        );
      }
      if (query.tags) {
        const filterTags = query.tags.split(',').map(tag => tag.trim());
        tasks = tasks.filter(task => 
          filterTags.some(tag => task.tags.includes(tag))
        );
      }

      // Apply pagination
      const start = query.offset;
      const end = start + query.limit;
      tasks = tasks.slice(start, end);

      return jsonWithCors(request, tasks);
    }

    // Enforce auth (dev fallback to mock when not authenticated)
    console.log('[TASKS] Attempting to get user ID from request')
    const userId = await getUserIdFromRequest(request)
    console.log('[TASKS] getUserIdFromRequest returned:', userId ? `User ID: ${userId}` : 'NULL')

    if (!userId) {
      console.error('[TASKS] No user ID - authentication failed')
      if (process.env.NODE_ENV !== 'production') {
        console.log('[TASKS] Development mode - returning mock data')
        // In development, allow UI to work without auth
        let tasks = generateMockTasks()
        // Apply minimal filtering for better UX
        if (query.status) tasks = tasks.filter(t => t.content.status === query.status)
        if (query.priority) tasks = tasks.filter(t => t.content.priority === query.priority)
        if (query.category) tasks = tasks.filter(t => t.content.category === query.category)
        const start = query.offset
        const end = start + query.limit
        tasks = tasks.slice(start, end)
        return jsonWithCors(request, tasks)
      }
      console.error('[TASKS] Production mode - returning 401 Unauthorized')
      return jsonWithCors(request, { error: 'Unauthorized' }, 401)
    }

    console.log('[TASKS] User authenticated, fetching tasks for user:', userId)

    // Get appropriate client based on auth type (API key vs OAuth)
    const client = await getClientForAuthType(request) || supabase

    if (!client) {
      console.error('[TASKS] CRITICAL: No database client available')
      return jsonWithCors(request, { error: 'Database configuration error' }, 500)
    }

    // Build Supabase query against tasks table with hierarchy support
    let dbQuery = client
      .from('tasks')
      .select(`
        *,
        is_ai_task,
        category:categories(id, name, color, icon)
      `)
      .eq('user_id', userId);

    // Apply filters (use UTC-converted query for date filters)
    if (utcQuery.status) {
      dbQuery = dbQuery.eq('status', utcQuery.status);
    }
    if (utcQuery.priority) {
      dbQuery = dbQuery.eq('priority', utcQuery.priority);
    }
    if (utcQuery.category) {
      // Only filter by category_id when the input looks like a UUID
      const uuidLike = /^[0-9a-fA-F-]{36}$/
      if (uuidLike.test(utcQuery.category)) {
        dbQuery = dbQuery.eq('category_id', utcQuery.category)
      } else {
        // Skip invalid category filter to avoid UUID cast errors
      }
    }
    if (utcQuery.assignee) {
      dbQuery = dbQuery.eq('assignee', utcQuery.assignee);
    }
    if (utcQuery.search) {
      dbQuery = dbQuery.or(`title.ilike.%${utcQuery.search}%,description.ilike.%${utcQuery.search}%`);
    }
    if (utcQuery.due_before) {
      dbQuery = dbQuery.lte('due_date', utcQuery.due_before);
    }
    if (utcQuery.due_after) {
      dbQuery = dbQuery.gte('due_date', utcQuery.due_after);
    }
    if (utcQuery.created_before) {
      dbQuery = dbQuery.lte('created_at', utcQuery.created_before);
    }
    if (utcQuery.created_after) {
      dbQuery = dbQuery.gte('created_at', utcQuery.created_after);
    }
    if (query.tags) {
      const filterTags = query.tags.split(',').map(tag => tag.trim());
      dbQuery = dbQuery.overlaps('tags', filterTags);
    }

    // Subtasks-specific filters
    if (query.parent_task_id) {
      dbQuery = dbQuery.eq('parent_task_id', query.parent_task_id);
    }
    if (query.root_tasks_only) {
      dbQuery = dbQuery.is('parent_task_id', null);
    }
    if (query.hierarchy_level !== undefined) {
      dbQuery = dbQuery.eq('hierarchy_level', query.hierarchy_level);
    }

    // Apply sorting
    const ascending = query.sort_order === 'asc';
    if (query.sort_by === 'title') {
      dbQuery = dbQuery.order('title', { ascending });
    } else if (query.sort_by === 'due_date') {
      dbQuery = dbQuery.order('due_date', { ascending, nullsFirst: false });
    } else if (query.sort_by === 'priority') {
      dbQuery = dbQuery.order('priority', { ascending });
    } else if (query.sort_by === 'hierarchy_level') {
      dbQuery = dbQuery.order('hierarchy_level', { ascending }).order('subtask_order', { ascending });
    } else if (query.sort_by === 'subtask_order') {
      dbQuery = dbQuery.order('parent_task_id', { ascending, nullsFirst: true }).order('subtask_order', { ascending });
    } else {
      dbQuery = dbQuery.order(query.sort_by, { ascending });
    }

    // Apply pagination
    dbQuery = dbQuery.range(query.offset, query.offset + query.limit - 1);

    console.log('[TASKS] Executing database query...')
    const { data, error } = await dbQuery;

    if (error) {
      console.error('[TASKS] Database error:', JSON.stringify(error));
      console.error('[TASKS] Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      if (process.env.NODE_ENV !== 'production') {
        console.log('[TASKS] Development mode - returning mock data after error')
        // Dev fallback: return mock instead of breaking the UI
        let tasks = generateMockTasks();
        const start = query.offset;
        const end = start + query.limit;
        tasks = tasks.slice(start, end);
        return jsonWithCors(request, tasks);
      }
      console.error('[TASKS] Production mode - returning error response')
      return NextResponse.json(
        { error: 'Failed to fetch tasks' },
        { status: 500 }
      );
    }

    // Map tasks rows to TaskMemory shape for compatibility
    const mapped = (data || []).map((row: any) => ({
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
        // Include subtasks hierarchy fields
        parent_task_id: row.parent_task_id || undefined,
        subtask_order: row.subtask_order || 0,
        completion_behavior: row.completion_behavior || 'manual',
        progress_calculation: row.progress_calculation || 'manual',
      },
      tags: row.tags || [],
      created_at: row.created_at,
      updated_at: row.updated_at,
      // Surface additional fields for frontend
      category_id: row.category_id,
      hierarchy_level: row.hierarchy_level,
      hierarchy_path: row.hierarchy_path,
      subtask_count: row.subtask_count || 0,
      completed_subtask_count: row.completed_subtask_count || 0,
    }));
    return jsonWithCors(request, mapped);
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

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
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 50)) { // Stricter limit for POST
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const body = await request.json();
    
    // Validate request body
    const validationResult = CreateTaskSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('CREATE TASK Validation failed:', validationResult.error.errors);
      return NextResponse.json(
        { error: 'Invalid task data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const taskData = validationResult.data;
    const now = nowUTC();

    // If Supabase is not configured, return mock response
    if (!supabase) {
      const mockTask: TaskMemory = {
        id: Date.now().toString(),
        type: 'task',
        content: taskData.content,
        tags: taskData.tags || [],
        metadata: taskData.metadata,
        created_at: now,
        updated_at: now
      };
      return jsonWithCors(request, mockTask, 201);
    }

    // Enforce auth
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401)
    }

    // Get appropriate client based on auth type
    const client = await getClientForAuthType(request) || supabase

    // Determine category_id - handle both category (name) and category_id (direct ID)
    let categoryId = null;
    if (taskData.content.category_id) {
      categoryId = taskData.content.category_id;
    } else if (taskData.content.category) {
      categoryId = await getCategoryIdByName(client, userId, taskData.content.category);
    }

    const insertPayload: any = {
      title: taskData.content.title,
      description: taskData.content.description || null,
      status: taskData.content.status || 'pending', // 使用数据库默认值
      priority: taskData.content.priority || 'medium', // 使用数据库默认值
      category_id: categoryId,
      due_date: taskData.content.due_date || null,
      estimated_duration: taskData.content.estimated_duration || null,
      progress: taskData.content.progress || 0,
      assignee: taskData.content.assignee || null,
      notes: taskData.content.notes || null,
      tags: taskData.tags || [],
      created_at: now,
      updated_at: now,
      user_id: userId,
      
      // Subtasks hierarchy fields
      parent_task_id: taskData.content.parent_task_id || null,
      subtask_order: taskData.content.subtask_order || 0,
      completion_behavior: taskData.content.completion_behavior || 'manual',
      progress_calculation: taskData.content.progress_calculation || 'manual',
    };

    // If creating with completed status and no explicit completion_date, set it to now
    if (insertPayload.status === 'completed' && !taskData.content.completion_date) {
      insertPayload.completion_date = now;
    }

    const { data, error } = await client
      .from('tasks')
      .insert(insertPayload)
      .select(`
        *,
        is_ai_task,
        category:categories(id, name, color, icon)
      `)
      .single();

    if (error) {
      console.error('Database error:', error);
      return jsonWithCors(request, { error: 'Failed to create task' }, 500);
    }

    const mapped: TaskMemory = {
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
      // Add additional fields for frontend
      category_id: data.category_id,
      hierarchy_level: data.hierarchy_level,
      hierarchy_path: data.hierarchy_path,
      subtask_count: data.subtask_count || 0,
      completed_subtask_count: data.completed_subtask_count || 0,
    } as any;
    
    console.log('Returning created task:', JSON.stringify(mapped, null, 2));
    return jsonWithCors(request, mapped, 201);
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}