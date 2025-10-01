import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getClientForAuthType, getUserIdFromRequest } from '@/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '@/lib/security';
import {
  UpdateTimelineMappingSchema,
  TimelineMappingMemory,
  ApplicationType
} from '../../../../../../lib/core-principles-types';
import { nowUTC } from '../../../../../../lib/time-utils';

// Create Supabase client (service key only for mock fallback; real requests use bearer token)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

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
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mappingId: string }> }
) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 300)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const { id: principleId, mappingId } = await params;

    // If Supabase is not configured, return mock response
    if (!supabase) {
      const mockMapping: TimelineMappingMemory = {
        id: mappingId,
        type: 'principle_timeline_mapping',
        content: {
          principle_id: principleId,
          timeline_item_id: 'timeline-1',
          application_type: ApplicationType.PRE_DECISION,
          reflection_notes: 'Mock timeline mapping for development',
          effectiveness_rating: 4,
          applied_at: new Date().toISOString()
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: 'mock-user'
      };
      return jsonWithCors(request, mockMapping);
    }

    // Enforce auth
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      if (process.env.NODE_ENV !== 'production') {
        // Return mock data in development
        const mockMapping: TimelineMappingMemory = {
          id: mappingId,
          type: 'principle_timeline_mapping',
          content: {
            principle_id: principleId,
            timeline_item_id: 'timeline-1',
            application_type: ApplicationType.PRE_DECISION,
            reflection_notes: 'Mock timeline mapping for development',
            effectiveness_rating: 4,
            applied_at: new Date().toISOString()
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: 'mock-user'
        };
        return jsonWithCors(request, mockMapping);
      }
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = await getClientForAuthType(request) || supabase;

    const { data, error } = await client
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
      return jsonWithCors(request, { error: 'Timeline mapping not found' }, 404);
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

    return jsonWithCors(request, mapped);
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
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
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mappingId: string }> }
) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 100)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const { id: principleId, mappingId } = await params;
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

    // If Supabase is not configured, return mock response
    if (!supabase) {
      const mockMapping: TimelineMappingMemory = {
        id: mappingId,
        type: 'principle_timeline_mapping',
        content: {
          principle_id: principleId,
          timeline_item_id: updateData.content?.timeline_item_id || 'timeline-1',
          application_type: updateData.content?.application_type || ApplicationType.PRE_DECISION,
          reflection_notes: updateData.content?.reflection_notes || 'Updated mock mapping',
          effectiveness_rating: updateData.content?.effectiveness_rating || 4,
          applied_at: updateData.content?.applied_at || new Date().toISOString()
        },
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: now,
        user_id: 'mock-user'
      };
      return jsonWithCors(request, mockMapping);
    }

    // Enforce auth
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = await getClientForAuthType(request) || supabase;

    // Check if mapping exists and user owns it
    const { data: existingMapping, error: fetchError } = await client
      .from('core_principle_timeline_items_mapping')
      .select('*')
      .eq('id', mappingId)
      .eq('principle_id', principleId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingMapping) {
      return jsonWithCors(request, { error: 'Timeline mapping not found' }, 404);
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

    const { data, error } = await client
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
      return jsonWithCors(request, { error: 'Failed to update timeline mapping' }, 500);
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

    return jsonWithCors(request, mapped);
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
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
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mappingId: string }> }
) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 50)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const { id: principleId, mappingId } = await params;

    // If Supabase is not configured, return mock response
    if (!supabase) {
      return jsonWithCors(request, { message: 'Timeline mapping deleted successfully' });
    }

    // Enforce auth
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = await getClientForAuthType(request) || supabase;

    // Check if mapping exists and user owns it
    const { data: existingMapping, error: fetchError } = await client
      .from('core_principle_timeline_items_mapping')
      .select('*')
      .eq('id', mappingId)
      .eq('principle_id', principleId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingMapping) {
      return jsonWithCors(request, { error: 'Timeline mapping not found' }, 404);
    }

    const { error } = await client
      .from('core_principle_timeline_items_mapping')
      .delete()
      .eq('id', mappingId)
      .eq('principle_id', principleId)
      .eq('user_id', userId);

    if (error) {
      console.error('Database error:', error);
      return jsonWithCors(request, { error: 'Failed to delete timeline mapping' }, 500);
    }

    return jsonWithCors(request, { message: 'Timeline mapping deleted successfully' });
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}