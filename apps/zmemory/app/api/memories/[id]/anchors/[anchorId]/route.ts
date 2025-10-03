import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabaseServer } from '@/lib/supabase-server';
import {
  MemoryAnchorUpdateSchema,
  type MemoryAnchorUpdateBody
} from '@/validation';
import { nowUTC } from '../../../../../../lib/time-utils';

export const dynamic = 'force-dynamic';

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
async function handlePut(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string; anchorId: string }> }
): Promise<NextResponse> {
  const { id: memoryId, anchorId } = await params;
  const userId = request.userId!;
  const anchorData = request.validatedBody!;

  if (!supabaseServer) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // Transform local_time_range for database storage
  let transformedData = { ...anchorData };
  if (anchorData.local_time_range) {
    const start = anchorData.local_time_range.start;
    const end = anchorData.local_time_range.end;
    transformedData.local_time_range = `[${start},${end || start})` as any;
  }

  // Verify memory belongs to user
  const { data: memoryCheck, error: memoryError } = await supabaseServer
    .from('memories')
    .select('id')
    .eq('id', memoryId)
    .eq('user_id', userId)
    .single();

  if (memoryError || !memoryCheck) {
    return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
  }

  // Check if the specific anchor exists
  const { data: existingAnchor, error: anchorError } = await supabaseServer
    .from('memory_anchors')
    .select('memory_id, anchor_item_id, relation_type')
    .eq('memory_id', memoryId)
    .eq('anchor_item_id', anchorId)
    .single();

  if (anchorError || !existingAnchor) {
    return NextResponse.json({ error: 'Anchor not found' }, { status: 404 });
  }

  // If relation_type is being changed, check for conflicts
  if (anchorData.relation_type && anchorData.relation_type !== existingAnchor.relation_type) {
    const { data: conflictCheck } = await supabaseServer
      .from('memory_anchors')
      .select('memory_id')
      .eq('memory_id', memoryId)
      .eq('anchor_item_id', anchorId)
      .eq('relation_type', anchorData.relation_type)
      .single();

    if (conflictCheck) {
      return NextResponse.json({ error: 'Anchor with this relation type already exists' }, { status: 409 });
    }
  }

  // Update anchor
  const { data, error } = await supabaseServer
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
    return NextResponse.json({ error: 'Failed to update anchor' }, { status: 500 });
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

  return NextResponse.json(data);
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
async function handleDelete(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string; anchorId: string }> }
): Promise<NextResponse> {
  const { id: memoryId, anchorId } = await params;
  const userId = request.userId!;

  if (!supabaseServer) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const relationTypeFilter = searchParams.get('relation_type');

  // Verify memory belongs to user
  const { data: memoryCheck, error: memoryError } = await supabaseServer
    .from('memories')
    .select('id')
    .eq('id', memoryId)
    .eq('user_id', userId)
    .single();

  if (memoryError || !memoryCheck) {
    return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
  }

  // Build delete query
  let deleteQuery = supabaseServer
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
    return NextResponse.json({ error: 'Failed to delete anchor' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Anchor deleted successfully' });
}

export const PUT = withStandardMiddleware(handlePut, {
  validation: { bodySchema: MemoryAnchorUpdateSchema },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 50
  }
});

export const DELETE = withStandardMiddleware(handleDelete, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 30
  }
});

export const OPTIONS = withStandardMiddleware(async () => {
  return new NextResponse(null, { status: 200 });
}, {
  auth: false
});