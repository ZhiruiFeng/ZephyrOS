import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserIdFromRequest, getClientForAuthType } from '@/auth'
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '@/lib/security'
import { z } from 'zod'

// Server-side Supabase client using service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

// =====================================================
// TYPES & VALIDATION SCHEMAS
// =====================================================

const DelegateTaskSchema = z.object({
  agent_id: z.string().uuid('Agent ID must be a valid UUID'),
  objective: z.string().min(1, 'Objective is required'),
  mode: z.enum(['plan_only', 'dry_run', 'execute']).default('plan_only'),
  guardrails: z.record(z.any()).optional()
})

// =====================================================
// OPTIONS handler for CORS
// =====================================================
export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request)
}

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
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request)
    if (isRateLimited(clientIP, 15 * 60 * 1000, 20)) { // Stricter limit for delegation
      return jsonWithCors(request, { error: 'Too many requests' }, 429)
    }

    if (!supabase) {
      return jsonWithCors(request, { error: 'Database connection not available' }, 503)
    }

    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return jsonWithCors(request, { error: 'Authentication required' }, 401)
    }

    const client = await getClientForAuthType(request) || supabase
    const { id: strategicTaskId } = await params

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(strategicTaskId)) {
      return jsonWithCors(request, { error: 'Invalid strategic task ID format' }, 400)
    }

    const body = await request.json()

    // Validate request body
    const validationResult = DelegateTaskSchema.safeParse(body)
    if (!validationResult.success) {
      return jsonWithCors(request, {
        error: 'Invalid delegation data',
        details: validationResult.error.errors
      }, 400)
    }

    const { agent_id, objective, mode, guardrails } = validationResult.data

    // Check if strategic task exists and belongs to user
    const { data: strategicTask, error: taskError } = await client
      .from('core_strategy_tasks')
      .select('*')
      .eq('id', strategicTaskId)
      .eq('user_id', userId)
      .single()

    if (taskError || !strategicTask) {
      return jsonWithCors(request, { error: 'Strategic task not found' }, 404)
    }

    // Check if task is already delegated
    if (strategicTask.assignee === 'ai_agent') {
      return jsonWithCors(request, {
        error: 'Task is already delegated to an AI agent',
        details: 'Please revoke the current delegation before reassigning to a different agent.'
      }, 409)
    }

    // Check if task is in a suitable state for delegation
    if (strategicTask.status === 'completed' || strategicTask.status === 'cancelled') {
      return jsonWithCors(request, {
        error: 'Cannot delegate completed or cancelled tasks',
        details: `Task status is '${strategicTask.status}' and cannot be delegated.`
      }, 409)
    }

    // Verify that the agent exists and belongs to the user
    const { data: agent, error: agentError } = await client
      .from('ai_agents')
      .select('id, name')
      .eq('id', agent_id)
      .eq('user_id', userId)
      .single()

    if (agentError || !agent) {
      return jsonWithCors(request, { error: 'AI agent not found or access denied' }, 404)
    }

    // Use the delegate_strategic_task_to_ai function from our database schema
    const { data: aiTaskId, error: delegateError } = await client
      .rpc('delegate_strategic_task_to_ai', {
        strategic_task_uuid: strategicTaskId,
        agent_uuid: agent_id,
        objective: objective,
        mode: mode || 'plan_only',
        guardrails: guardrails || null
      })

    if (delegateError) {
      console.error('Delegation error:', delegateError)
      return jsonWithCors(request, { error: 'Failed to delegate task to AI agent' }, 500)
    }

    // Get the updated strategic task with delegation info
    const { data: updatedTask, error: fetchError } = await client
      .rpc('get_strategic_task_with_ai_delegation', {
        strategic_task_uuid: strategicTaskId
      })

    if (fetchError) {
      console.error('Error fetching updated task:', fetchError)
      // Still return success since delegation succeeded
      return jsonWithCors(request, {
        message: 'Task delegated successfully',
        ai_task_id: aiTaskId,
        strategic_task: strategicTask
      }, 201)
    }

    return jsonWithCors(request, {
      message: 'Task delegated successfully',
      ai_task_id: aiTaskId,
      strategic_task: updatedTask,
      agent: {
        id: agent.id,
        name: agent.name
      }
    }, 201)
  } catch (error) {
    console.error('API error:', error)
    const errorMessage = sanitizeErrorMessage(error)
    return jsonWithCors(request, { error: errorMessage }, 500)
  }
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
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request)
    if (isRateLimited(clientIP, 15 * 60 * 1000, 20)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429)
    }

    if (!supabase) {
      return jsonWithCors(request, { error: 'Database connection not available' }, 503)
    }

    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return jsonWithCors(request, { error: 'Authentication required' }, 401)
    }

    const client = await getClientForAuthType(request) || supabase
    const { id: strategicTaskId } = await params

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(strategicTaskId)) {
      return jsonWithCors(request, { error: 'Invalid strategic task ID format' }, 400)
    }

    // Check if strategic task exists and belongs to user
    const { data: strategicTask, error: taskError } = await client
      .from('core_strategy_tasks')
      .select('*')
      .eq('id', strategicTaskId)
      .eq('user_id', userId)
      .single()

    if (taskError || !strategicTask) {
      return jsonWithCors(request, { error: 'Strategic task not found' }, 404)
    }

    // Check if task is actually delegated
    if (strategicTask.assignee !== 'ai_agent') {
      return jsonWithCors(request, {
        error: 'Task is not currently delegated to an AI agent'
      }, 404)
    }

    // If there's a linked regular task, cancel any active AI tasks
    if (strategicTask.task_id) {
      const { error: cancelError } = await client
        .from('ai_tasks')
        .update({ status: 'cancelled' })
        .eq('task_id', strategicTask.task_id)
        .eq('user_id', userId)
        .in('status', ['assigned', 'in_progress', 'pending'])

      if (cancelError) {
        console.error('Error cancelling AI tasks:', cancelError)
        // Continue with revocation even if cancelling AI tasks fails
      }
    }

    // Update strategic task to remove delegation
    const { data: updatedTask, error: updateError } = await client
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
      .single()

    if (updateError) {
      console.error('Error updating strategic task:', updateError)
      return jsonWithCors(request, { error: 'Failed to revoke delegation' }, 500)
    }

    return jsonWithCors(request, {
      message: 'AI delegation revoked successfully',
      strategic_task: {
        id: updatedTask.id,
        title: updatedTask.title,
        assignee: updatedTask.assignee,
        status: updatedTask.status,
        initiative: updatedTask.initiative,
        regular_task: updatedTask.regular_task
      }
    })
  } catch (error) {
    console.error('API error:', error)
    const errorMessage = sanitizeErrorMessage(error)
    return jsonWithCors(request, { error: errorMessage }, 500)
  }
}