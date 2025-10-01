import { NextRequest, NextResponse } from 'next/server';
import { getClientForAuthType, getUserIdFromRequest } from '@/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '@/lib/security';
import { 
  CreateSubtaskRequest,
  SubtaskTreeNode,
  TaskMemory
} from '@/validation';
import { z } from 'zod';

// Validation schemas
const taskDataSchema = z.object({
  type: z.literal('task'),
  content: z.object({
    title: z.string().min(1, 'Task title is required').max(200, 'Title too long'),
    description: z.string().optional(),
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'on_hold']).default('pending'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    category_id: z.string().optional(),
    due_date: z.string().datetime().optional(),
    estimated_duration: z.number().positive().optional(),
    progress: z.number().min(0).max(100).default(0),
    assignee: z.string().optional(),
    notes: z.string().optional(),
    completion_behavior: z.enum(['manual', 'auto_when_subtasks_complete']).default('manual'),
    progress_calculation: z.enum(['manual', 'average_subtasks', 'weighted_subtasks']).default('manual'),
  }),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

const CreateSubtaskSchema = z.object({
  parent_task_id: z.string().uuid('Invalid parent task ID'),
  task_data: taskDataSchema.optional(),
  task: taskDataSchema.optional(), // Alternative field name for backward compatibility
  subtask_order: z.number().int().min(0).optional()
}).refine(data => {
  // Ensure either task_data or task is provided
  return data.task_data || data.task;
}, {
  message: "Either task_data or task must be provided",
  path: ["task_data"]
}).transform(data => {
  // Normalize to use task_data
  const normalized = { ...data };
  if (data.task && !data.task_data) {
    normalized.task_data = data.task;
  }
  return normalized;
});

const SubtaskQuerySchema = z.object({
  parent_task_id: z.string().uuid('Invalid parent task ID'),
  max_depth: z.string().regex(/^\d+$/).transform(Number).default('5'),
  include_completed: z.enum(['true', 'false']).transform(val => val === 'true').default('true')
});

/**
 * @swagger
 * /api/subtasks:
 *   get:
 *     summary: Get subtasks tree for a parent task
 *     description: Retrieve hierarchical subtasks for a given parent task
 *     tags: [Subtasks]
 *     parameters:
 *       - in: query
 *         name: parent_task_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the parent task
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
 *     responses:
 *       200:
 *         description: Subtasks tree
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SubtaskTreeNode'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         description: Parent task not found
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
    
    // Parse and validate query parameters
    const queryResult = SubtaskQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!queryResult.success) {
      return jsonWithCors(request, 
        { error: 'Invalid query parameters', details: queryResult.error.errors }, 
        400
      );
    }

    const query = queryResult.data;

    // Enforce auth
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = await getClientForAuthType(request);
    if (!client) {
      return jsonWithCors(request, { error: 'Database connection failed' }, 500);
    }

    // First verify the parent task exists and belongs to the user
    const { data: parentTask, error: parentError } = await client
      .from('tasks')
      .select('id')
      .eq('id', query.parent_task_id)
      .eq('user_id', userId)
      .single();

    if (parentError || !parentTask) {
      return jsonWithCors(request, { error: 'Parent task not found' }, 404);
    }

    // Use the database function to get subtask tree
    const { data: subtaskTree, error: treeError } = await client
      .rpc('get_subtask_tree', {
        root_task_id: query.parent_task_id,
        max_depth: query.max_depth
      });

    if (treeError) {
      console.error('Database error:', treeError);
      return jsonWithCors(request, { error: 'Failed to fetch subtask tree' }, 500);
    }

    // Filter out completed tasks if requested
    let filteredTree = subtaskTree || [];
    if (!query.include_completed) {
      filteredTree = filteredTree.filter((node: SubtaskTreeNode) => node.status !== 'completed');
    }

    // Remove the root task from the tree (we only want its subtasks)
    const subtasksOnly = filteredTree.filter((node: SubtaskTreeNode) => 
      node.task_id !== query.parent_task_id
    );

    return jsonWithCors(request, subtasksOnly);
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

/**
 * @swagger
 * /api/subtasks:
 *   post:
 *     summary: Create a new subtask
 *     description: Create a new subtask under a parent task
 *     tags: [Subtasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSubtaskRequest'
 *           example:
 *             parent_task_id: "123e4567-e89b-12d3-a456-426614174000"
 *             task_data:
 *               type: "task"
 *               content:
 *                 title: "Research user requirements"
 *                 description: "Conduct user interviews and surveys"
 *                 status: "pending"
 *                 priority: "medium"
 *               tags: ["research", "user-experience"]
 *             subtask_order: 1
 *     responses:
 *       201:
 *         description: Subtask created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaskMemory'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         description: Parent task not found
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 30)) { // Stricter limit for POST
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const body = await request.json();
    
    // Validate request body
    const validationResult = CreateSubtaskSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('CREATE SUBTASK Validation failed:', validationResult.error.errors);
      return jsonWithCors(request,
        { error: 'Invalid subtask data', details: validationResult.error.errors },
        400
      );
    }

    const subtaskData = validationResult.data;
    const now = new Date().toISOString();

    // Ensure task_data exists (should be guaranteed by validation)
    if (!subtaskData.task_data) {
      return jsonWithCors(request, { error: 'task_data is required' }, 400);
    }

    // Enforce auth
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = await getClientForAuthType(request);
    if (!client) {
      return jsonWithCors(request, { error: 'Database connection failed' }, 500);
    }

    // Verify the parent task exists and belongs to the user
    const { data: parentTask, error: parentError } = await client
      .from('tasks')
      .select('id, hierarchy_level')
      .eq('id', subtaskData.parent_task_id)
      .eq('user_id', userId)
      .single();

    if (parentError || !parentTask) {
      return jsonWithCors(request, { error: 'Parent task not found' }, 404);
    }

    // Check hierarchy depth limit (prevent too deep nesting)
    if (parentTask.hierarchy_level >= 9) { // Allow max 10 levels (0-9)
      return jsonWithCors(request, 
        { error: 'Maximum hierarchy depth exceeded' }, 
        400
      );
    }

    // If no subtask_order provided, get the next order number
    let subtaskOrder = subtaskData.subtask_order || 0;
    if (subtaskOrder === 0) {
      const { data: maxOrderData } = await client
        .from('tasks')
        .select('subtask_order')
        .eq('parent_task_id', subtaskData.parent_task_id)
        .order('subtask_order', { ascending: false })
        .limit(1)
        .single();
      
      subtaskOrder = (maxOrderData?.subtask_order || 0) + 1;
    }

    // Build the insert payload
    const insertPayload = {
      title: subtaskData.task_data.content.title,
      description: subtaskData.task_data.content.description || null,
      status: subtaskData.task_data.content.status,
      priority: subtaskData.task_data.content.priority,
      category_id: subtaskData.task_data.content.category_id || null,
      due_date: subtaskData.task_data.content.due_date || null,
      estimated_duration: subtaskData.task_data.content.estimated_duration || null,
      progress: subtaskData.task_data.content.progress || 0,
      assignee: subtaskData.task_data.content.assignee || null,
      notes: subtaskData.task_data.content.notes || null,
      tags: subtaskData.task_data.tags || [],
      created_at: now,
      updated_at: now,
      user_id: userId,
      
      // Subtask-specific fields
      parent_task_id: subtaskData.parent_task_id,
      subtask_order: subtaskOrder,
      completion_behavior: subtaskData.task_data.content.completion_behavior || 'manual',
      progress_calculation: subtaskData.task_data.content.progress_calculation || 'manual',
    };

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
      return jsonWithCors(request, { error: 'Failed to create subtask' }, 500);
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
        parent_task_id: data.parent_task_id,
        subtask_order: data.subtask_order || 0,
        completion_behavior: data.completion_behavior || 'manual',
        progress_calculation: data.progress_calculation || 'manual',
      },
      tags: data.tags || [],
      created_at: data.created_at,
      updated_at: data.updated_at,
      category_id: data.category_id,
      hierarchy_level: data.hierarchy_level,
      hierarchy_path: data.hierarchy_path,
      subtask_count: data.subtask_count || 0,
      completed_subtask_count: data.completed_subtask_count || 0,
      is_ai_task: data.is_ai_task,
    } as any;
    
    console.log('Returning created subtask:', JSON.stringify(mapped, null, 2));
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