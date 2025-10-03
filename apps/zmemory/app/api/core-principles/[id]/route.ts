import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabaseServer } from '@/lib/config/supabase-server';
import {
  UpdateCorePrincipleSchema,
  CorePrincipleMemory
} from '@/lib/types/core-principles-types';
import { nowUTC } from '@/lib/utils/time-utils';

/**
 * @swagger
 * /api/core-principles/{id}:
 *   get:
 *     summary: Get a specific core principle by ID
 *     description: Retrieve a single core principle by its ID
 *     tags: [Core Principles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The core principle ID
 *     responses:
 *       200:
 *         description: Core principle found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CorePrincipleMemory'
 *       404:
 *         description: Core principle not found
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function handleGet(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: principleId } = await params;
  const userId = request.userId!;

  const { data, error } = await supabaseServer!
    .from('core_principles')
    .select('*')
    .eq('id', principleId)
    .or(`user_id.eq.${userId},is_default.eq.true`) // User's principles + defaults
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Core principle not found' }, { status: 404 });
  }

  const mapped: CorePrincipleMemory = {
    id: data.id,
    type: 'core_principle',
    content: {
      title: data.title,
      description: data.description || undefined,
      category: data.category,
      status: data.status,
      is_default: data.is_default,
      source: data.source,
      trigger_questions: data.trigger_questions || [],
      application_examples: data.application_examples || [],
      personal_notes: data.personal_notes || undefined,
      importance_level: data.importance_level,
      application_count: data.application_count,
      last_applied_at: data.last_applied_at || undefined,
      deprecated_at: data.deprecated_at || undefined,
      deprecation_reason: data.deprecation_reason || undefined
    },
    metadata: data.metadata || {},
    created_at: data.created_at,
    updated_at: data.updated_at,
    user_id: data.user_id
  };

  return NextResponse.json(mapped);
}

/**
 * @swagger
 * /api/core-principles/{id}:
 *   put:
 *     summary: Update a core principle
 *     description: Update an existing core principle by ID
 *     tags: [Core Principles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The core principle ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCorePrincipleRequest'
 *     responses:
 *       200:
 *         description: Core principle updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CorePrincipleMemory'
 *       404:
 *         description: Core principle not found
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function handlePut(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: principleId } = await params;
  const userId = request.userId!;
  const body = await request.json();

  // Validate request body
  const validationResult = UpdateCorePrincipleSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      { error: 'Invalid core principle data', details: validationResult.error.errors },
      { status: 400 }
    );
  }

  const updateData = validationResult.data;
  const now = nowUTC();

  // Check if principle exists and user owns it (cannot update defaults)
  const { data: existingPrinciple, error: fetchError } = await supabaseServer!
    .from('core_principles')
    .select('*')
    .eq('id', principleId)
    .eq('user_id', userId)
    .eq('is_default', false) // Can only update non-default principles
    .single();

  if (fetchError || !existingPrinciple) {
    return NextResponse.json(
      { error: 'Core principle not found or cannot be modified' },
      { status: 404 }
    );
  }

  // Build update payload
  const updatePayload: any = {
    updated_at: now
  };

  if (updateData.content?.title !== undefined) updatePayload.title = updateData.content.title;
  if (updateData.content?.description !== undefined) updatePayload.description = updateData.content.description;
  if (updateData.content?.category !== undefined) updatePayload.category = updateData.content.category;
  if (updateData.content?.status !== undefined) updatePayload.status = updateData.content.status;
  if (updateData.content?.trigger_questions !== undefined) updatePayload.trigger_questions = updateData.content.trigger_questions;
  if (updateData.content?.application_examples !== undefined) updatePayload.application_examples = updateData.content.application_examples;
  if (updateData.content?.personal_notes !== undefined) updatePayload.personal_notes = updateData.content.personal_notes;
  if (updateData.content?.importance_level !== undefined) updatePayload.importance_level = updateData.content.importance_level;
  if (updateData.content?.deprecated_at !== undefined) updatePayload.deprecated_at = updateData.content.deprecated_at;
  if (updateData.content?.deprecation_reason !== undefined) updatePayload.deprecation_reason = updateData.content.deprecation_reason;
  if (updateData.metadata !== undefined) updatePayload.metadata = updateData.metadata;

  const { data, error } = await supabaseServer!
    .from('core_principles')
    .update(updatePayload)
    .eq('id', principleId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to update core principle' }, { status: 500 });
  }

  const mapped: CorePrincipleMemory = {
    id: data.id,
    type: 'core_principle',
    content: {
      title: data.title,
      description: data.description || undefined,
      category: data.category,
      status: data.status,
      is_default: data.is_default,
      source: data.source,
      trigger_questions: data.trigger_questions || [],
      application_examples: data.application_examples || [],
      personal_notes: data.personal_notes || undefined,
      importance_level: data.importance_level,
      application_count: data.application_count,
      last_applied_at: data.last_applied_at || undefined,
      deprecated_at: data.deprecated_at || undefined,
      deprecation_reason: data.deprecation_reason || undefined
    },
    metadata: data.metadata || {},
    created_at: data.created_at,
    updated_at: data.updated_at,
    user_id: data.user_id
  };

  return NextResponse.json(mapped);
}

/**
 * @swagger
 * /api/core-principles/{id}:
 *   delete:
 *     summary: Delete a core principle
 *     description: Delete a core principle by ID (only non-default principles can be deleted)
 *     tags: [Core Principles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The core principle ID
 *     responses:
 *       200:
 *         description: Core principle deleted successfully
 *       404:
 *         description: Core principle not found
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function handleDelete(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: principleId } = await params;
  const userId = request.userId!;

  // Check if principle exists and user owns it (cannot delete defaults)
  const { data: existingPrinciple, error: fetchError } = await supabaseServer!
    .from('core_principles')
    .select('*')
    .eq('id', principleId)
    .eq('user_id', userId)
    .eq('is_default', false) // Can only delete non-default principles
    .single();

  if (fetchError || !existingPrinciple) {
    return NextResponse.json(
      { error: 'Core principle not found or cannot be deleted' },
      { status: 404 }
    );
  }

  const { error } = await supabaseServer!
    .from('core_principles')
    .delete()
    .eq('id', principleId)
    .eq('user_id', userId);

  if (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to delete core principle' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Core principle deleted successfully' });
}

export const GET = withStandardMiddleware(handleGet, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 300 }
});

export const PUT = withStandardMiddleware(handlePut, {
  validation: { bodySchema: UpdateCorePrincipleSchema },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 100 }
});

export const DELETE = withStandardMiddleware(handleDelete, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 50 }
});
