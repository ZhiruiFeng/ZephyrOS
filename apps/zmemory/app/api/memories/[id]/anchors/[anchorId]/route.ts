import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClientForRequest, getUserIdFromRequest } from '../../../../../../lib/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '../../../../../../lib/security';
import { 
  MemoryAnchorUpdateSchema,
  type MemoryAnchorUpdateBody
} from '../../../../../../lib/validators';
import { nowUTC } from '../../../../../../lib/time-utils';

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * @swagger
 * /api/memories/{id}/anchors/{anchorId}:
 *   put:
 *     summary: Update a memory anchor
 *     description: Update an existing anchor relationship
 *     tags: [Memory Anchors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Memory ID
 *       - in: path
 *         name: anchorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Target timeline item ID (anchor_item_id)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               relation_type:
 *                 type: string
 *                 enum: [context_of, result_of, insight_from, about, co_occurred, triggered_by, reflects_on]
 *               local_time_range:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: string
 *                     format: date-time
 *                   end:
 *                     type: string
 *                     format: date-time
 *               weight:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 10
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Anchor updated successfully
 *       404:
 *         description: Anchor not found
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; anchorId: string }> }
) {
  const { id: memoryId, anchorId } = await params;
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 50)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const body = await request.json();
    
    console.log('=== UPDATE MEMORY ANCHOR API DEBUG ===');
    console.log('Memory ID:', memoryId);
    console.log('Anchor ID:', anchorId);
    console.log('Received body:', JSON.stringify(body, null, 2));
    
    // Validate request body
    const validationResult = MemoryAnchorUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('UPDATE ANCHOR Validation failed:', validationResult.error.errors);
      return NextResponse.json(
        { error: 'Invalid anchor data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const anchorData = validationResult.data;

    // Transform local_time_range for database storage
    let transformedData = { ...anchorData };
    if (anchorData.local_time_range) {
      const start = anchorData.local_time_range.start;
      const end = anchorData.local_time_range.end;
      transformedData.local_time_range = `[${start},${end || start})` as any;
    }

    // If no database configuration, return mock response
    if (!supabase) {
      const mockUpdatedAnchor = {
        memory_id: memoryId,
        anchor_item_id: anchorId,
        ...transformedData
      };
      return jsonWithCors(request, mockUpdatedAnchor);
    }

    // Enforce authentication
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = createClientForRequest(request) || supabase;

    // Verify memory belongs to user
    const { data: memoryCheck, error: memoryError } = await client
      .from('memories')
      .select('id')
      .eq('id', memoryId)
      .eq('user_id', userId)
      .single();

    if (memoryError || !memoryCheck) {
      return jsonWithCors(request, { error: 'Memory not found' }, 404);
    }

    // Check if the specific anchor exists
    const { data: existingAnchor, error: anchorError } = await client
      .from('memory_anchors')
      .select('memory_id, anchor_item_id, relation_type')
      .eq('memory_id', memoryId)
      .eq('anchor_item_id', anchorId)
      .single();

    if (anchorError || !existingAnchor) {
      return jsonWithCors(request, { error: 'Anchor not found' }, 404);
    }

    // If relation_type is being changed, check for conflicts
    if (anchorData.relation_type && anchorData.relation_type !== existingAnchor.relation_type) {
      const { data: conflictCheck } = await client
        .from('memory_anchors')
        .select('memory_id')
        .eq('memory_id', memoryId)
        .eq('anchor_item_id', anchorId)
        .eq('relation_type', anchorData.relation_type)
        .single();

      if (conflictCheck) {
        return jsonWithCors(request, { error: 'Anchor with this relation type already exists' }, 409);
      }
    }

    console.log('Updating anchor with payload:', JSON.stringify(transformedData, null, 2));

    // Update anchor
    const { data, error } = await client
      .from('memory_anchors')
      .update(transformedData)
      .eq('memory_id', memoryId)
      .eq('anchor_item_id', anchorId)
      .eq('relation_type', existingAnchor.relation_type) // Use original relation_type for WHERE
      .select(`
        *,
        timeline_item:timeline_items!anchor_item_id (
          id,
          type,
          title,
          description,
          status,
          priority,
          category_id,
          tags
        )
      `)
      .single();

    if (error) {
      console.error('Database error:', error);
      return jsonWithCors(request, { error: 'Failed to update anchor' }, 500);
    }

    // Transform local_time_range back for response
    if (data.local_time_range) {
      try {
        const rangeMatch = data.local_time_range.match(/^\[(.+),(.+)\)$/);
        if (rangeMatch) {
          const [, start, end] = rangeMatch;
          data.local_time_range = {
            start,
            end: end !== start ? end : undefined
          };
        }
      } catch (e) {
        console.warn('Failed to parse local_time_range:', data.local_time_range);
        data.local_time_range = null;
      }
    }

    console.log('Returning updated anchor:', JSON.stringify(data, null, 2));
    return jsonWithCors(request, data);
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

/**
 * @swagger
 * /api/memories/{id}/anchors/{anchorId}:
 *   delete:
 *     summary: Delete a memory anchor
 *     description: Remove an anchor relationship between a memory and timeline item
 *     tags: [Memory Anchors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Memory ID
 *       - in: path
 *         name: anchorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Target timeline item ID (anchor_item_id)
 *       - in: query
 *         name: relation_type
 *         schema:
 *           type: string
 *           enum: [context_of, result_of, insight_from, about, co_occurred, triggered_by, reflects_on]
 *         description: Specific relation type to delete (if multiple exist)
 *     responses:
 *       200:
 *         description: Anchor deleted successfully
 *       404:
 *         description: Anchor not found
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; anchorId: string }> }
) {
  const { id: memoryId, anchorId } = await params;
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 30)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const { searchParams } = new URL(request.url);
    const relationTypeFilter = searchParams.get('relation_type');

    // If no database configuration, return mock response
    if (!supabase) {
      return jsonWithCors(request, { message: 'Anchor deleted successfully (mock)' });
    }

    // Enforce authentication
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = createClientForRequest(request) || supabase;

    // Verify memory belongs to user
    const { data: memoryCheck, error: memoryError } = await client
      .from('memories')
      .select('id')
      .eq('id', memoryId)
      .eq('user_id', userId)
      .single();

    if (memoryError || !memoryCheck) {
      return jsonWithCors(request, { error: 'Memory not found' }, 404);
    }

    // Build delete query
    let deleteQuery = client
      .from('memory_anchors')
      .delete()
      .eq('memory_id', memoryId)
      .eq('anchor_item_id', anchorId);

    // If specific relation type is provided, filter by it
    if (relationTypeFilter) {
      deleteQuery = deleteQuery.eq('relation_type', relationTypeFilter);
    }

    const { error } = await deleteQuery;

    if (error) {
      console.error('Database error:', error);
      return jsonWithCors(request, { error: 'Failed to delete anchor' }, 500);
    }

    return jsonWithCors(request, { message: 'Anchor deleted successfully' });
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}