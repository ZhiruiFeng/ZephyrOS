import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabaseServer } from '@/lib/supabase-server';
import {
  UpdateTimelineMappingSchema,
  TimelineMappingMemory,
  ApplicationType
} from '../../../../../../lib/core-principles-types';
import { nowUTC } from '../../../../../../lib/time-utils';

/**
 * @swagger
 * /api/core-principles/{id}/timeline-mappings/{mappingId}:
 *   get:
 *     summary: Get a specific timeline mapping
 *     description: Retrieve a single timeline mapping by its ID
 *     tags: [Core Principles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The core principle ID
 *       - in: path
 *         name: mappingId
 *         required: true
 *         schema:
 *           type: string
 *         description: The timeline mapping ID
 *     responses:
 *       200:
 *         description: Timeline mapping found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TimelineMappingMemory'
 *       404:
 *         description: Timeline mapping not found
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function handleGet(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string; mappingId: string }> }
): Promise<NextResponse> {
  const { id: principleId, mappingId } = await params;
  const userId = request.userId!;

  const { data, error } = await supabaseServer!
    .from('core_principle_timeline_items_mapping')
    .select(`
      *,
      principle:core_principles(id, title, category),
      timeline_item:timeline_items(id, title, type)
    `)
    .eq('id', mappingId)
    .eq('principle_id', principleId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Timeline mapping not found' }, { status: 404 });
  }

  const mapped: TimelineMappingMemory = {
    id: data.id,
    type: 'principle_timeline_mapping',
    content: {
      principle_id: data.principle_id,
      timeline_item_id: data.timeline_item_id,
      application_type: data.application_type,
      reflection_notes: data.reflection_notes || undefined,
      effectiveness_rating: data.effectiveness_rating || undefined,
      lessons_learned: data.lessons_learned || undefined,
      decision_context: data.decision_context || undefined,
      outcome_observed: data.outcome_observed || undefined,
      would_apply_again: data.would_apply_again || undefined,
      applied_at: data.applied_at
    },
    created_at: data.created_at,
    updated_at: data.updated_at,
    user_id: data.user_id,
    // Add populated relations
    principle: data.principle || undefined,
    timeline_item: data.timeline_item || undefined
  };

  return NextResponse.json(mapped);
}

/**
 * @swagger
 * /api/core-principles/{id}/timeline-mappings/{mappingId}:
 *   put:
 *     summary: Update a timeline mapping
 *     description: Update an existing timeline mapping by ID
 *     tags: [Core Principles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The core principle ID
 *       - in: path
 *         name: mappingId
 *         required: true
 *         schema:
 *           type: string
 *         description: The timeline mapping ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTimelineMappingRequest'
 *     responses:
 *       200:
 *         description: Timeline mapping updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TimelineMappingMemory'
 *       404:
 *         description: Timeline mapping not found
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function handlePut(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string; mappingId: string }> }
): Promise<NextResponse> {
  const { id: principleId, mappingId } = await params;
  const userId = request.userId!;
  const body = await request.json();

  // Validate request body
  const validationResult = UpdateTimelineMappingSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      { error: 'Invalid timeline mapping data', details: validationResult.error.errors },
      { status: 400 }
    );
  }

  const updateData = validationResult.data;
  const now = nowUTC();

  // Check if mapping exists and user owns it
  const { data: existingMapping, error: fetchError } = await supabaseServer!
    .from('core_principle_timeline_items_mapping')
    .select('*')
    .eq('id', mappingId)
    .eq('principle_id', principleId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existingMapping) {
    return NextResponse.json({ error: 'Timeline mapping not found' }, { status: 404 });
  }

  // Build update payload
  const updatePayload: any = {
    updated_at: now
  };

  if (updateData.content?.timeline_item_id !== undefined) updatePayload.timeline_item_id = updateData.content.timeline_item_id;
  if (updateData.content?.application_type !== undefined) updatePayload.application_type = updateData.content.application_type;
  if (updateData.content?.reflection_notes !== undefined) updatePayload.reflection_notes = updateData.content.reflection_notes;
  if (updateData.content?.effectiveness_rating !== undefined) updatePayload.effectiveness_rating = updateData.content.effectiveness_rating;
  if (updateData.content?.lessons_learned !== undefined) updatePayload.lessons_learned = updateData.content.lessons_learned;
  if (updateData.content?.decision_context !== undefined) updatePayload.decision_context = updateData.content.decision_context;
  if (updateData.content?.outcome_observed !== undefined) updatePayload.outcome_observed = updateData.content.outcome_observed;
  if (updateData.content?.would_apply_again !== undefined) updatePayload.would_apply_again = updateData.content.would_apply_again;
  if (updateData.content?.applied_at !== undefined) updatePayload.applied_at = updateData.content.applied_at;

  const { data, error } = await supabaseServer!
    .from('core_principle_timeline_items_mapping')
    .update(updatePayload)
    .eq('id', mappingId)
    .eq('principle_id', principleId)
    .eq('user_id', userId)
    .select(`
      *,
      principle:core_principles(id, title, category),
      timeline_item:timeline_items(id, title, type)
    `)
    .single();

  if (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to update timeline mapping' }, { status: 500 });
  }

  const mapped: TimelineMappingMemory = {
    id: data.id,
    type: 'principle_timeline_mapping',
    content: {
      principle_id: data.principle_id,
      timeline_item_id: data.timeline_item_id,
      application_type: data.application_type,
      reflection_notes: data.reflection_notes || undefined,
      effectiveness_rating: data.effectiveness_rating || undefined,
      lessons_learned: data.lessons_learned || undefined,
      decision_context: data.decision_context || undefined,
      outcome_observed: data.outcome_observed || undefined,
      would_apply_again: data.would_apply_again || undefined,
      applied_at: data.applied_at
    },
    created_at: data.created_at,
    updated_at: data.updated_at,
    user_id: data.user_id,
    // Add populated relations
    principle: data.principle || undefined,
    timeline_item: data.timeline_item || undefined
  };

  return NextResponse.json(mapped);
}

/**
 * @swagger
 * /api/core-principles/{id}/timeline-mappings/{mappingId}:
 *   delete:
 *     summary: Delete a timeline mapping
 *     description: Delete a timeline mapping by ID
 *     tags: [Core Principles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The core principle ID
 *       - in: path
 *         name: mappingId
 *         required: true
 *         schema:
 *           type: string
 *         description: The timeline mapping ID
 *     responses:
 *       200:
 *         description: Timeline mapping deleted successfully
 *       404:
 *         description: Timeline mapping not found
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function handleDelete(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string; mappingId: string }> }
): Promise<NextResponse> {
  const { id: principleId, mappingId } = await params;
  const userId = request.userId!;

  // Check if mapping exists and user owns it
  const { data: existingMapping, error: fetchError } = await supabaseServer!
    .from('core_principle_timeline_items_mapping')
    .select('*')
    .eq('id', mappingId)
    .eq('principle_id', principleId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existingMapping) {
    return NextResponse.json({ error: 'Timeline mapping not found' }, { status: 404 });
  }

  const { error } = await supabaseServer!
    .from('core_principle_timeline_items_mapping')
    .delete()
    .eq('id', mappingId)
    .eq('principle_id', principleId)
    .eq('user_id', userId);

  if (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to delete timeline mapping' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Timeline mapping deleted successfully' });
}

export const GET = withStandardMiddleware(handleGet, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 300 }
});

export const PUT = withStandardMiddleware(handlePut, {
  validation: { bodySchema: UpdateTimelineMappingSchema },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 100 }
});

export const DELETE = withStandardMiddleware(handleDelete, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 50 }
});

export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
