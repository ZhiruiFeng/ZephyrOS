import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/lib/middleware';
import { supabaseServer } from '@/lib/supabase-server';
import { z } from 'zod';

// =====================================================
// TYPES & VALIDATION SCHEMAS
// =====================================================

const DelegateTaskSchema = z.object({
  agent_id: z.string().uuid('Agent ID must be a valid UUID'),
  objective: z.string().min(1, 'Objective is required'),
  mode: z.enum(['plan_only', 'dry_run', 'execute']).default('plan_only'),
  guardrails: z.record(z.any()).optional()
});

// =====================================================
// POST /api/strategy/tasks/[id]/delegate
// Delegate a strategic task to an AI agent
// =====================================================
/**
 * @swagger
 * /api/strategy/tasks/{id}/delegate:
 *   post:
 *     summary: Delegate a strategic task to an AI agent
 *     description: Delegate a strategic task to an AI agent using the existing ai_tasks infrastructure
 *     tags: [Strategy]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Strategic task UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agent_id
 *               - objective
 *             properties:
 *               agent_id:
 *                 type: string
 *                 format: uuid
 *                 description: UUID of the AI agent to delegate to
 *               objective:
 *                 type: string
 *                 description: Clear objective description for the AI agent
 *               mode:
 *                 type: string
 *                 enum: [plan_only, dry_run, execute]
 *                 default: plan_only
 *                 description: Execution mode for the AI task
 *               guardrails:
 *                 type: object
 *                 description: Safety constraints and limits for AI execution
 *           example:
 *             agent_id: "123e4567-e89b-12d3-a456-426614174000"
 *             objective: "Research and analyze market opportunities for our new product line"
 *             mode: "plan_only"
 *             guardrails:
 *               costCapUSD: 50
 *               timeCapMin: 120
 *               requiresHumanApproval: true
 *     responses:
 *       201:
 *         description: Task delegated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 ai_task_id:
 *                   type: string
 *                   format: uuid
 *                 strategic_task:
 *                   type: object
 *                   description: Updated strategic task with delegation info
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Strategic task or agent not found
 *       401:
 *         description: Authentication required
 *       409:
 *         description: Task already delegated or not suitable for delegation
 *       500:
 *         description: Internal server error
 */
async function handlePost(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const userId = request.userId!;
  const { id: strategicTaskId } = await params;

  if (!supabaseServer) {
    return NextResponse.json({ error: 'Database connection not available' }, { status: 503 });
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(strategicTaskId)) {
    return NextResponse.json({ error: 'Invalid strategic task ID format' }, { status: 400 });
  }

  // Validate request body
  const validationResult = DelegateTaskSchema.safeParse(request.validatedBody);
  if (!validationResult.success) {
    return NextResponse.json({
      error: 'Invalid delegation data',
      details: validationResult.error.errors
    }, { status: 400 });
  }

  const { agent_id, objective, mode, guardrails } = validationResult.data;

  // Check if strategic task exists and belongs to user
  const { data: strategicTask, error: taskError } = await supabaseServer
    .from('core_strategy_tasks')
    .select('*')
    .eq('id', strategicTaskId)
    .eq('user_id', userId)
    .single();

  if (taskError || !strategicTask) {
    return NextResponse.json({ error: 'Strategic task not found' }, { status: 404 });
  }

  // Check if task is already delegated
  if (strategicTask.assignee === 'ai_agent') {
    return NextResponse.json({
      error: 'Task is already delegated to an AI agent',
      details: 'Please revoke the current delegation before reassigning to a different agent.'
    }, { status: 409 });
  }

  // Check if task is in a suitable state for delegation
  if (strategicTask.status === 'completed' || strategicTask.status === 'cancelled') {
    return NextResponse.json({
      error: 'Cannot delegate completed or cancelled tasks',
      details: `Task status is '${strategicTask.status}' and cannot be delegated.`
    }, { status: 409 });
  }

  // Verify that the agent exists and belongs to the user
  const { data: agent, error: agentError } = await supabaseServer
    .from('ai_agents')
    .select('id, name')
    .eq('id', agent_id)
    .eq('user_id', userId)
    .single();

  if (agentError || !agent) {
    return NextResponse.json({ error: 'AI agent not found or access denied' }, { status: 404 });
  }

  // Use the delegate_strategic_task_to_ai function from our database schema
  const { data: aiTaskId, error: delegateError } = await supabaseServer
    .rpc('delegate_strategic_task_to_ai', {
      strategic_task_uuid: strategicTaskId,
      agent_uuid: agent_id,
      objective: objective,
      mode: mode || 'plan_only',
      guardrails: guardrails || null,
      p_user_id: userId // Pass user_id for service role support
    });

  if (delegateError) {
    console.error('Delegation error:', delegateError);
    return NextResponse.json({ error: 'Failed to delegate task to AI agent' }, { status: 500 });
  }

  // Get the updated strategic task with delegation info
  const { data: updatedTask, error: fetchError } = await supabaseServer
    .rpc('get_strategic_task_with_ai_delegation', {
      strategic_task_uuid: strategicTaskId,
      p_user_id: userId // Pass user_id for service role support
    });

  if (fetchError) {
    console.error('Error fetching updated task:', fetchError);
    // Still return success since delegation succeeded
    return NextResponse.json({
      message: 'Task delegated successfully',
      ai_task_id: aiTaskId,
      strategic_task: strategicTask
    }, { status: 201 });
  }

  return NextResponse.json({
    message: 'Task delegated successfully',
    ai_task_id: aiTaskId,
    strategic_task: updatedTask,
    agent: {
      id: agent.id,
      name: agent.name
    }
  }, { status: 201 });
}

// =====================================================
// DELETE /api/strategy/tasks/[id]/delegate
// Revoke AI delegation for a strategic task
// =====================================================
/**
 * @swagger
 * /api/strategy/tasks/{id}/delegate:
 *   delete:
 *     summary: Revoke AI delegation for a strategic task
 *     description: Remove AI delegation and return task to manual assignment
 *     tags: [Strategy]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Strategic task UUID
 *     responses:
 *       200:
 *         description: Delegation revoked successfully
 *       404:
 *         description: Strategic task not found or not delegated
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
async function handleDelete(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const userId = request.userId!;
  const { id: strategicTaskId } = await params;

  if (!supabaseServer) {
    return NextResponse.json({ error: 'Database connection not available' }, { status: 503 });
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(strategicTaskId)) {
    return NextResponse.json({ error: 'Invalid strategic task ID format' }, { status: 400 });
  }

  // Check if strategic task exists and belongs to user
  const { data: strategicTask, error: taskError } = await supabaseServer
    .from('core_strategy_tasks')
    .select('*')
    .eq('id', strategicTaskId)
    .eq('user_id', userId)
    .single();

  if (taskError || !strategicTask) {
    return NextResponse.json({ error: 'Strategic task not found' }, { status: 404 });
  }

  // Check if task is actually delegated
  if (strategicTask.assignee !== 'ai_agent') {
    return NextResponse.json({
      error: 'Task is not currently delegated to an AI agent'
    }, { status: 404 });
  }

  // If there's a linked regular task, cancel any active AI tasks
  if (strategicTask.task_id) {
    const { error: cancelError } = await supabaseServer
      .from('ai_tasks')
      .update({ status: 'cancelled' })
      .eq('task_id', strategicTask.task_id)
      .eq('user_id', userId)
      .in('status', ['assigned', 'in_progress', 'pending']);

    if (cancelError) {
      console.error('Error cancelling AI tasks:', cancelError);
      // Continue with revocation even if cancelling AI tasks fails
    }
  }

  // Update strategic task to remove delegation
  const { data: updatedTask, error: updateError } = await supabaseServer
    .from('core_strategy_tasks')
    .update({
      assignee: 'me' // Change back to manual assignment
    })
    .eq('id', strategicTaskId)
    .eq('user_id', userId)
    .select(`
      *,
      initiative:core_strategy_initiatives(id, title, status),
      regular_task:tasks(id, title, status)
    `)
    .single();

  if (updateError) {
    console.error('Error updating strategic task:', updateError);
    return NextResponse.json({ error: 'Failed to revoke delegation' }, { status: 500 });
  }

  return NextResponse.json({
    message: 'AI delegation revoked successfully',
    strategic_task: {
      id: updatedTask.id,
      title: updatedTask.title,
      assignee: updatedTask.assignee,
      status: updatedTask.status,
      initiative: updatedTask.initiative,
      regular_task: updatedTask.regular_task
    }
  });
}

export const POST = withStandardMiddleware(handlePost, {
  validation: { bodySchema: DelegateTaskSchema },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 30 }
});

export const DELETE = withStandardMiddleware(handleDelete, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 30 }
});
