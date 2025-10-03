import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabaseServer } from '@/lib/supabase-server';
import { z } from 'zod';

// =====================================================
// TYPES & VALIDATION SCHEMAS
// =====================================================

const InitiativeStatusSchema = z.enum(['planning', 'active', 'completed', 'paused', 'cancelled']);
const InitiativePrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
const ProgressCalculationSchema = z.enum(['manual', 'task_based', 'weighted_tasks']);

const UpdateInitiativeSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  anchor_goal: z.string().optional(),
  success_metric: z.string().optional(),
  status: InitiativeStatusSchema.optional(),
  priority: InitiativePrioritySchema.optional(),
  progress: z.number().min(0).max(100).optional(),
  progress_calculation: ProgressCalculationSchema.optional(),
  start_date: z.string().optional(),
  due_date: z.string().optional(),
  completion_date: z.string().optional(),
  season_id: z.string().uuid().optional(),
  category_id: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

// =====================================================
// GET /api/strategy/initiatives/[id]
// Get a specific strategic initiative
// =====================================================
/**
 * @swagger
 * /api/strategy/initiatives/{id}:
 *   get:
 *     summary: Get a strategic initiative by ID
 *     description: Retrieve a specific strategic initiative by its UUID
 *     tags: [Strategy]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Initiative UUID
 *     responses:
 *       200:
 *         description: Strategic initiative data
 *       404:
 *         description: Initiative not found
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
async function handleGet(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const userId = request.userId!;
  const { id: initiativeId } = await params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(initiativeId)) {
    return NextResponse.json({ error: 'Invalid initiative ID format' }, { status: 400 });
  }

  const { data, error } = await supabaseServer!
    .from('core_strategy_initiatives')
    .select(`
      *,
      season:seasons(id, title, theme),
      category:categories(id, name, color, icon)
    `)
    .eq('id', initiativeId)
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Database error:', error);
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Initiative not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to fetch initiative' }, { status: 500 });
  }

  // Get task counts for this initiative
  const { data: taskCounts } = await supabaseServer!
    .from('core_strategy_tasks')
    .select('status')
    .eq('initiative_id', initiativeId)
    .eq('user_id', userId);

  const task_count = taskCounts?.length || 0;
  const completed_task_count = taskCounts?.filter(t => t.status === 'completed').length || 0;

  const initiative = {
    id: data.id,
    user_id: data.user_id,
    season_id: data.season_id,
    title: data.title,
    description: data.description,
    anchor_goal: data.anchor_goal,
    success_metric: data.success_metric,
    status: data.status,
    priority: data.priority,
    progress: data.progress,
    progress_calculation: data.progress_calculation,
    start_date: data.start_date,
    due_date: data.due_date,
    completion_date: data.completion_date,
    tags: data.tags || [],
    category_id: data.category_id,
    metadata: data.metadata || {},
    created_at: data.created_at,
    updated_at: data.updated_at,
    season: data.season || null,
    category: data.category || null,
    task_count,
    completed_task_count
  };

  return NextResponse.json(initiative);
}

// =====================================================
// PUT /api/strategy/initiatives/[id]
// Update a specific strategic initiative
// =====================================================
/**
 * @swagger
 * /api/strategy/initiatives/{id}:
 *   put:
 *     summary: Update a strategic initiative
 *     description: Update a specific strategic initiative by its UUID
 *     tags: [Strategy]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Initiative UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               anchor_goal:
 *                 type: string
 *               success_metric:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [planning, active, completed, paused, cancelled]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *               progress:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *               progress_calculation:
 *                 type: string
 *                 enum: [manual, task_based, weighted_tasks]
 *               start_date:
 *                 type: string
 *                 format: date
 *               due_date:
 *                 type: string
 *                 format: date
 *               season_id:
 *                 type: string
 *                 format: uuid
 *               category_id:
 *                 type: string
 *                 format: uuid
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Initiative updated successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Initiative not found
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
async function handlePut(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const userId = request.userId!;
  const { id: initiativeId } = await params;
  const body = await request.json();

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(initiativeId)) {
    return NextResponse.json({ error: 'Invalid initiative ID format' }, { status: 400 });
  }

  // Validate request body
  const validationResult = UpdateInitiativeSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json({
      error: 'Invalid update data',
      details: validationResult.error.errors
    }, { status: 400 });
  }

  const updateData = validationResult.data;

  // Check if initiative exists and belongs to user
  const { data: existingInitiative, error: checkError } = await supabaseServer!
    .from('core_strategy_initiatives')
    .select('id')
    .eq('id', initiativeId)
    .eq('user_id', userId)
    .single();

  if (checkError || !existingInitiative) {
    return NextResponse.json({ error: 'Initiative not found' }, { status: 404 });
  }

  // Prepare update payload (only include fields that are provided)
  const updatePayload: any = {};

  Object.keys(updateData).forEach(key => {
    if (updateData[key as keyof typeof updateData] !== undefined) {
      const value = updateData[key as keyof typeof updateData];
      // Convert empty strings to null for date fields
      if ((key === 'start_date' || key === 'due_date' || key === 'completion_date') && value === '') {
        updatePayload[key] = null;
      } else {
        updatePayload[key] = value;
      }
    }
  });

  // If updating to completed status and no explicit completion_date, set it to now
  if (updatePayload.status === 'completed' && !updatePayload.completion_date) {
    updatePayload.completion_date = new Date().toISOString();
  }

  // If updating from completed status to another status, clear completion_date
  if (updatePayload.status && updatePayload.status !== 'completed') {
    updatePayload.completion_date = null;
  }

  const { data, error } = await supabaseServer!
    .from('core_strategy_initiatives')
    .update(updatePayload)
    .eq('id', initiativeId)
    .eq('user_id', userId)
    .select(`
      *,
      season:seasons(id, title, theme),
      category:categories(id, name, color, icon)
    `)
    .single();

  if (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to update initiative' }, { status: 500 });
  }

  // Get task counts for this initiative
  const { data: taskCounts } = await supabaseServer!
    .from('core_strategy_tasks')
    .select('status')
    .eq('initiative_id', initiativeId)
    .eq('user_id', userId);

  const task_count = taskCounts?.length || 0;
  const completed_task_count = taskCounts?.filter(t => t.status === 'completed').length || 0;

  const initiative = {
    id: data.id,
    user_id: data.user_id,
    season_id: data.season_id,
    title: data.title,
    description: data.description,
    anchor_goal: data.anchor_goal,
    success_metric: data.success_metric,
    status: data.status,
    priority: data.priority,
    progress: data.progress,
    progress_calculation: data.progress_calculation,
    start_date: data.start_date,
    due_date: data.due_date,
    completion_date: data.completion_date,
    tags: data.tags || [],
    category_id: data.category_id,
    metadata: data.metadata || {},
    created_at: data.created_at,
    updated_at: data.updated_at,
    season: data.season || null,
    category: data.category || null,
    task_count,
    completed_task_count
  };

  return NextResponse.json(initiative);
}

// =====================================================
// DELETE /api/strategy/initiatives/[id]
// Delete a specific strategic initiative
// =====================================================
/**
 * @swagger
 * /api/strategy/initiatives/{id}:
 *   delete:
 *     summary: Delete a strategic initiative
 *     description: Delete a specific strategic initiative by its UUID
 *     tags: [Strategy]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Initiative UUID
 *     responses:
 *       200:
 *         description: Initiative deleted successfully
 *       404:
 *         description: Initiative not found
 *       401:
 *         description: Authentication required
 *       409:
 *         description: Cannot delete initiative with active tasks
 *       500:
 *         description: Internal server error
 */
async function handleDelete(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const userId = request.userId!;
  const { id: initiativeId } = await params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(initiativeId)) {
    return NextResponse.json({ error: 'Invalid initiative ID format' }, { status: 400 });
  }

  // Check if initiative exists and belongs to user
  const { data: existingInitiative, error: checkError } = await supabaseServer!
    .from('core_strategy_initiatives')
    .select('id, title')
    .eq('id', initiativeId)
    .eq('user_id', userId)
    .single();

  if (checkError || !existingInitiative) {
    return NextResponse.json({ error: 'Initiative not found' }, { status: 404 });
  }

  // Check if there are any active tasks associated with this initiative
  const { data: activeTasks, error: tasksError } = await supabaseServer!
    .from('core_strategy_tasks')
    .select('id')
    .eq('initiative_id', initiativeId)
    .eq('user_id', userId)
    .neq('status', 'completed')
    .neq('status', 'cancelled');

  if (tasksError) {
    console.error('Error checking for active tasks:', tasksError);
    return NextResponse.json({ error: 'Failed to check for active tasks' }, { status: 500 });
  }

  if (activeTasks && activeTasks.length > 0) {
    return NextResponse.json({
      error: 'Cannot delete initiative with active tasks',
      details: `This initiative has ${activeTasks.length} active task(s). Please complete or cancel all tasks before deleting the initiative.`
    }, { status: 409 });
  }

  // Delete the initiative (CASCADE will handle related tasks and memories)
  const { error: deleteError } = await supabaseServer!
    .from('core_strategy_initiatives')
    .delete()
    .eq('id', initiativeId)
    .eq('user_id', userId);

  if (deleteError) {
    console.error('Database error:', deleteError);
    return NextResponse.json({ error: 'Failed to delete initiative' }, { status: 500 });
  }

  return NextResponse.json({
    message: 'Initiative deleted successfully',
    deleted_initiative: {
      id: initiativeId,
      title: existingInitiative.title
    }
  });
}

export const GET = withStandardMiddleware(handleGet, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 300 }
});

export const PUT = withStandardMiddleware(handlePut, {
  validation: { bodySchema: UpdateInitiativeSchema },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 100 }
});

export const DELETE = withStandardMiddleware(handleDelete, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 50 }
});

export const OPTIONS = withStandardMiddleware(async () => new NextResponse(null, { status: 200 }), {
  auth: false
});
