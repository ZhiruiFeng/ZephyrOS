import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  CreateTaskSchema, 
  TaskQuerySchema, 
  TaskMemory,
  TaskStatus,
  TaskPriority,
  TaskCategory
} from '../../../lib/task-types';

// Create Supabase client
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
      notes: 'Making good progress on the implementation'
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
      estimated_duration: 120
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
      estimated_duration: 240
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

      return NextResponse.json(tasks);
    }

    // Build Supabase query against tasks table
    let dbQuery = supabase
      .from('tasks')
      .select('*');

    // Apply filters
    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status);
    }
    if (query.priority) {
      dbQuery = dbQuery.eq('priority', query.priority);
    }
    // category/assignee 不在 tasks 表中，忽略
    if (query.search) {
      dbQuery = dbQuery.or(`title.ilike.%${query.search}%,description.ilike.%${query.search}%`);
    }
    if (query.due_before) {
      dbQuery = dbQuery.lte('due_date', query.due_before);
    }
    if (query.due_after) {
      dbQuery = dbQuery.gte('due_date', query.due_after);
    }
    if (query.created_before) {
      dbQuery = dbQuery.lte('created_at', query.created_before);
    }
    if (query.created_after) {
      dbQuery = dbQuery.gte('created_at', query.created_after);
    }
    if (query.tags) {
      const filterTags = query.tags.split(',').map(tag => tag.trim());
      dbQuery = dbQuery.overlaps('tags', filterTags);
    }

    // Apply sorting
    const ascending = query.sort_order === 'asc';
    if (query.sort_by === 'title') {
      dbQuery = dbQuery.order('title', { ascending });
    } else if (query.sort_by === 'due_date') {
      dbQuery = dbQuery.order('due_date', { ascending, nullsFirst: false });
    } else if (query.sort_by === 'priority') {
      dbQuery = dbQuery.order('priority', { ascending });
    } else {
      dbQuery = dbQuery.order(query.sort_by, { ascending });
    }

    // Apply pagination
    dbQuery = dbQuery.range(query.offset, query.offset + query.limit - 1);

    const { data, error } = await dbQuery;

    if (error) {
      console.error('Database error:', error);
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
        due_date: row.due_date || undefined,
      },
      tags: row.tags || [],
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
    return NextResponse.json(mapped);
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
    const body = await request.json();
    
    // Validate request body
    const validationResult = CreateTaskSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid task data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const taskData = validationResult.data;
    const now = new Date().toISOString();

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
      return NextResponse.json(mockTask, { status: 201 });
    }

    const insertPayload: any = {
      title: taskData.content.title,
      description: taskData.content.description || null,
      status: taskData.content.status,
      priority: taskData.content.priority,
      due_date: taskData.content.due_date || null,
      tags: taskData.tags || [],
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create task' },
        { status: 500 }
      );
    }

    const mapped: TaskMemory = {
      id: data.id,
      type: 'task',
      content: {
        title: data.title,
        description: data.description || undefined,
        status: data.status,
        priority: data.priority,
        due_date: data.due_date || undefined,
      },
      tags: data.tags || [],
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
    return NextResponse.json(mapped, { status: 201 });
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