import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabaseServer } from '@/lib/config/supabase-server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Update schema for timeline items (including Memory-specific fields when type='memory')
const TimelineItemUpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  start_time: z.string().datetime().optional(),
  end_time: z.string().datetime().optional(),
  category_id: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['active', 'inactive', 'completed', 'cancelled', 'archived']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  metadata: z.record(z.any()).optional(),
  render_on_timeline: z.boolean().optional(),
  // Memory-specific fields (when type='memory')
  note: z.string().optional(),
  title_override: z.string().optional(),
  memory_type: z.enum(['note', 'link', 'file', 'thought', 'quote', 'insight']).optional(),
  emotion_valence: z.number().int().min(-5).max(5).optional(),
  emotion_arousal: z.number().int().min(0).max(5).optional(),
  energy_delta: z.number().int().min(-5).max(5).optional(),
  place_name: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  is_highlight: z.boolean().optional(),
  salience_score: z.number().min(0).max(1).optional(),
  source: z.string().optional(),
  context: z.string().optional(),
  mood: z.number().int().min(1).max(10).optional(),
  importance_level: z.enum(['low', 'medium', 'high']).optional(),
  related_to: z.array(z.string()).optional(),
  memory_tags: z.array(z.string()).optional(),
  memory_status: z.enum(['active', 'archived', 'deleted']).optional(),
  captured_at: z.string().datetime().optional(),
  happened_range: z.object({
    start: z.string().datetime(),
    end: z.string().datetime().optional()
  }).optional()
});

/**
 * @swagger
 * /api/timeline-items/{id}:
 *   get:
 *     summary: Get a specific timeline item by ID
 *     description: Retrieve detailed information about a timeline item, including Memory-specific data if applicable
 *     tags: [Timeline Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Timeline item ID
 *     responses:
 *       200:
 *         description: Timeline item details
 *       404:
 *         description: Timeline item not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
async function handleGetTimelineItem(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const userId = request.userId!;
  const { id } = await params;

  if (!supabaseServer) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // First get the basic timeline item to determine its type
  const { data: timelineItem, error: timelineError } = await supabaseServer
    .from('timeline_items')
    .select('*, category:categories(id, name, color, icon)')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (timelineError) {
    if (timelineError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Timeline item not found' }, { status: 404 });
    }
    console.error('Timeline item query error:', timelineError);
    return NextResponse.json({ error: 'Failed to fetch timeline item' }, { status: 500 });
  }

  let enhancedItem = { ...timelineItem };

  // If this is a memory, fetch memory-specific data
  if (timelineItem.type === 'memory') {
    const { data: memoryData, error: memoryError } = await supabaseServer
      .from('memories')
      .select('*')
      .eq('id', id)
      .single();

    if (!memoryError && memoryData) {
      enhancedItem = {
        ...enhancedItem,
        captured_at: memoryData.captured_at,
        happened_range: memoryData.happened_range,
        note: memoryData.note,
        title_override: memoryData.title_override,
        memory_type: memoryData.memory_type,
        emotion_valence: memoryData.emotion_valence,
        emotion_arousal: memoryData.emotion_arousal,
        energy_delta: memoryData.energy_delta,
        place_name: memoryData.place_name,
        latitude: memoryData.latitude,
        longitude: memoryData.longitude,
        is_highlight: memoryData.is_highlight,
        salience_score: memoryData.salience_score,
        source: memoryData.source,
        context: memoryData.context,
        mood: memoryData.mood,
        importance_level: memoryData.importance_level,
        related_to: memoryData.related_to,
        memory_tags: memoryData.tags,
        memory_status: memoryData.status,
        display_title: memoryData.title_override || timelineItem.title
      };
    }
  }

  return NextResponse.json(enhancedItem);
}

/**
 * @swagger
 * /api/timeline-items/{id}:
 *   put:
 *     summary: Update a specific timeline item
 *     description: Update timeline item data, including Memory-specific fields if applicable
 *     tags: [Timeline Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               note:
 *                 type: string
 *               memory_type:
 *                 type: string
 *                 enum: [note, link, file, thought, quote, insight]
 *     responses:
 *       200:
 *         description: Timeline item updated successfully
 *       404:
 *         description: Timeline item not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
async function handleUpdateTimelineItem(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const userId = request.userId!;
  const updateData = request.validatedBody!;
  const { id } = await params;

  if (!supabaseServer) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // First get the timeline item to determine its type
  const { data: existingItem, error: fetchError } = await supabaseServer
    .from('timeline_items')
    .select('type')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Timeline item not found' }, { status: 404 });
    }
    console.error('Timeline item fetch error:', fetchError);
    return NextResponse.json({ error: 'Failed to fetch timeline item' }, { status: 500 });
  }

  // Prepare timeline_items update payload
  const timelineItemsUpdate: any = {};
  const memoryUpdate: any = {};

  // Separate fields by table
  const timelineItemsFields = [
    'title', 'description', 'start_time', 'end_time', 'category_id',
    'tags', 'status', 'priority', 'metadata', 'render_on_timeline'
  ];

  const memoryFields = [
    'note', 'title_override', 'memory_type', 'emotion_valence',
    'emotion_arousal', 'energy_delta', 'place_name', 'latitude',
    'longitude', 'is_highlight', 'salience_score', 'source',
    'context', 'mood', 'importance_level', 'related_to',
    'memory_tags', 'memory_status', 'captured_at'
  ];

  // Distribute updates to appropriate tables
  for (const [key, value] of Object.entries(updateData)) {
    if (value !== undefined) {
      if (timelineItemsFields.includes(key)) {
        timelineItemsUpdate[key] = value;
      } else if (memoryFields.includes(key)) {
        // Handle field name mapping
        if (key === 'memory_tags') {
          memoryUpdate.tags = value;
        } else if (key === 'memory_status') {
          memoryUpdate.status = value;
        } else {
          memoryUpdate[key] = value;
        }
      }
    }
  }

  // Handle happened_range transformation
  if (updateData.happened_range) {
    const range = updateData.happened_range;
    if (range.end) {
      memoryUpdate.happened_range = `[${range.start}, ${range.end})`;
    } else {
      memoryUpdate.happened_range = `[${range.start}, ${range.start})`;
    }
  }

  let updatedTimelineItem;

  // Update timeline_items table
  if (Object.keys(timelineItemsUpdate).length > 0) {
    const { data, error } = await supabaseServer
      .from('timeline_items')
      .update(timelineItemsUpdate)
      .eq('id', id)
      .eq('user_id', userId)
      .select('*, category:categories(id, name, color, icon)')
      .single();

    if (error) {
      console.error('Timeline items update error:', error);
      return NextResponse.json({ error: 'Failed to update timeline item' }, { status: 500 });
    }

    updatedTimelineItem = data;
  } else {
    // If no timeline_items updates, fetch current data
    const { data } = await supabaseServer
      .from('timeline_items')
      .select('*, category:categories(id, name, color, icon)')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    updatedTimelineItem = data;
  }

  // Update memory table if this is a memory and there are memory updates
  if (existingItem.type === 'memory' && Object.keys(memoryUpdate).length > 0) {
    const { data: memoryData, error: memoryError } = await supabaseServer
      .from('memories')
      .update(memoryUpdate)
      .eq('id', id)
      .select('*')
      .single();

    if (memoryError) {
      console.error('Memory update error:', memoryError);
      return NextResponse.json({
        error: 'Failed to update memory data',
        timeline_item: updatedTimelineItem
      }, { status: 500 });
    }

    // Merge memory data with timeline item
    if (memoryData) {
      updatedTimelineItem = {
        ...updatedTimelineItem,
        captured_at: memoryData.captured_at,
        happened_range: memoryData.happened_range,
        note: memoryData.note,
        title_override: memoryData.title_override,
        memory_type: memoryData.memory_type,
        emotion_valence: memoryData.emotion_valence,
        emotion_arousal: memoryData.emotion_arousal,
        energy_delta: memoryData.energy_delta,
        place_name: memoryData.place_name,
        latitude: memoryData.latitude,
        longitude: memoryData.longitude,
        is_highlight: memoryData.is_highlight,
        salience_score: memoryData.salience_score,
        source: memoryData.source,
        context: memoryData.context,
        mood: memoryData.mood,
        importance_level: memoryData.importance_level,
        related_to: memoryData.related_to,
        memory_tags: memoryData.tags,
        memory_status: memoryData.status,
        display_title: memoryData.title_override || updatedTimelineItem.title
      };
    }
  }

  return NextResponse.json(updatedTimelineItem);
}

/**
 * @swagger
 * /api/timeline-items/{id}:
 *   delete:
 *     summary: Delete a specific timeline item
 *     description: Delete a timeline item and all associated data (cascading delete)
 *     tags: [Timeline Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Timeline item deleted successfully
 *       404:
 *         description: Timeline item not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
async function handleDeleteTimelineItem(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const userId = request.userId!;
  const { id } = await params;

  if (!supabaseServer) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // Check if timeline item exists and belongs to user
  const { data: itemCheck, error: checkError } = await supabaseServer
    .from('timeline_items')
    .select('id, type')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (checkError || !itemCheck) {
    return NextResponse.json({ error: 'Timeline item not found' }, { status: 404 });
  }

  // Delete the timeline item (cascading delete will handle associated data)
  const { error } = await supabaseServer
    .from('timeline_items')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Timeline item deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete timeline item' }, { status: 500 });
  }

  return NextResponse.json({
    message: 'Timeline item deleted successfully',
    deleted_item: {
      id,
      type: itemCheck.type
    }
  });
}

export const GET = withStandardMiddleware(handleGetTimelineItem, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 300
  }
});

export const PUT = withStandardMiddleware(handleUpdateTimelineItem, {
  validation: { bodySchema: TimelineItemUpdateSchema },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 50
  }
});

export const DELETE = withStandardMiddleware(handleDeleteTimelineItem, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 30
  }
});

export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
