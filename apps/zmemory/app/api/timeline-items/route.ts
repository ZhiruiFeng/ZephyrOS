import { NextRequest, NextResponse } from 'next/server';
import { createClientForRequest, getUserIdFromRequest } from '../../../lib/auth';
import { jsonWithCors, createOptionsResponse } from '../../../lib/security';
import { z } from 'zod';

// Query schema for timeline items
const TimelineItemsQuerySchema = z.object({
  type: z.enum(['task', 'activity', 'routine', 'habit', 'memory']).optional(),
  status: z.enum(['active', 'inactive', 'completed', 'cancelled', 'archived']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  category_id: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  sort_by: z.enum(['created_at', 'updated_at', 'title', 'priority']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  tags: z.string().optional(), // comma-separated
});

// Create schema for timeline items
const CreateTimelineItemSchema = z.object({
  type: z.enum(['task', 'activity', 'routine', 'habit', 'memory']),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  start_time: z.string().datetime().optional(),
  end_time: z.string().datetime().optional(),
  category_id: z.string().uuid().optional(),
  tags: z.array(z.string()).default([]),
  status: z.enum(['active', 'inactive', 'completed', 'cancelled', 'archived']).default('active'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  metadata: z.record(z.any()).default({}),
});

/**
 * GET /api/timeline-items - Get timeline items with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = createClientForRequest(request);
    if (!client) {
      return jsonWithCors(request, { error: 'Supabase not configured' }, 500);
    }

    const { searchParams } = new URL(request.url);
    const queryResult = TimelineItemsQuerySchema.safeParse(Object.fromEntries(searchParams));
    
    if (!queryResult.success) {
      return jsonWithCors(request, { 
        error: 'Invalid query parameters', 
        details: queryResult.error.errors 
      }, 400);
    }

    const query = queryResult.data;

    // Build Supabase query
    let dbQuery = client
      .from('timeline_items')
      .select(`
        *,
        category:categories(id, name, color, icon)
      `)
      .eq('user_id', userId);

    // Apply filters
    if (query.type) {
      dbQuery = dbQuery.eq('type', query.type);
    }
    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status);
    }
    if (query.priority) {
      dbQuery = dbQuery.eq('priority', query.priority);
    }
    if (query.category_id) {
      dbQuery = dbQuery.eq('category_id', query.category_id);
    }
    if (query.search) {
      dbQuery = dbQuery.or(`title.ilike.%${query.search}%,description.ilike.%${query.search}%`);
    }
    if (query.tags) {
      const filterTags = query.tags.split(',').map(tag => tag.trim());
      dbQuery = dbQuery.overlaps('tags', filterTags);
    }

    // Apply sorting
    const ascending = query.sort_order === 'asc';
    dbQuery = dbQuery.order(query.sort_by, { ascending });

    // Apply pagination
    dbQuery = dbQuery.range(query.offset, query.offset + query.limit - 1);

    const { data, error } = await dbQuery;

    if (error) {
      console.error('Timeline items query error:', error);
      return jsonWithCors(request, { error: 'Failed to fetch timeline items' }, 500);
    }

    return jsonWithCors(request, { items: data || [] });
  } catch (error) {
    console.error('Timeline items API error:', error);
    return jsonWithCors(request, { error: 'Internal server error' }, 500);
  }
}

/**
 * POST /api/timeline-items - Create a new timeline item
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = createClientForRequest(request);
    if (!client) {
      return jsonWithCors(request, { error: 'Supabase not configured' }, 500);
    }

    const body = await request.json();
    const validationResult = CreateTimelineItemSchema.safeParse(body);

    if (!validationResult.success) {
      return jsonWithCors(request, {
        error: 'Invalid timeline item data',
        details: validationResult.error.errors
      }, 400);
    }

    const itemData = validationResult.data;

    // Note: For 'task' type, this will create both timeline_items and tasks records
    // due to the triggers we set up. For other types, only timeline_items will be created.
    
    const insertPayload = {
      type: itemData.type,
      title: itemData.title,
      description: itemData.description || null,
      start_time: itemData.start_time || null,
      end_time: itemData.end_time || null,
      category_id: itemData.category_id || null,
      tags: itemData.tags,
      status: itemData.status,
      priority: itemData.priority,
      user_id: userId,
      metadata: itemData.metadata,
    };

    const { data, error } = await client
      .from('timeline_items')
      .insert(insertPayload)
      .select(`
        *,
        category:categories(id, name, color, icon)
      `)
      .single();

    if (error) {
      console.error('Timeline item creation error:', error);
      return jsonWithCors(request, { error: 'Failed to create timeline item' }, 500);
    }

    return jsonWithCors(request, { item: data }, 201);
  } catch (error) {
    console.error('Timeline items POST API error:', error);
    return jsonWithCors(request, { error: 'Internal server error' }, 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}
