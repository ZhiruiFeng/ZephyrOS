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
  sort_by: z.enum(['created_at', 'updated_at', 'title', 'priority', 'captured_at', 'salience_score']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  // Memory-specific basic filters for general timeline viewing
  is_highlight: z.string().optional().transform(v => v === 'true'),
  memory_type: z.enum(['note', 'link', 'file', 'thought', 'quote', 'insight']).optional(),
  render_on_timeline: z.string().optional().transform(v => v === 'true'),
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

    // Build Supabase query with enhanced selection for Memory types
    let selectClause = `
      *,
      category:categories(id, name, color, icon)
    `;

    // If filtering for memories or no type filter (include all types), join memory data
    if (!query.type || query.type === 'memory') {
      selectClause = `
        *,
        category:categories(id, name, color, icon),
        memory:memories(
          captured_at,
          happened_range,
          note,
          title_override,
          memory_type,
          emotion_valence,
          is_highlight,
          salience_score,
          place_name,
          importance_level,
          tags,
          status
        )
      `;
    }

    let dbQuery = client
      .from('timeline_items')
      .select(selectClause)
      .eq('user_id', userId);

    // Apply basic filters
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
    if (query.render_on_timeline !== undefined) {
      dbQuery = dbQuery.eq('render_on_timeline', query.render_on_timeline);
    }

    // Enhanced search including Memory fields when applicable
    if (query.search) {
      let searchConditions = `title.ilike.%${query.search}%,description.ilike.%${query.search}%`;
      
      // If not filtering by type or filtering for memory, include memory-specific search
      if (!query.type || query.type === 'memory') {
        searchConditions += `,memories.note.ilike.%${query.search}%,memories.context.ilike.%${query.search}%,memories.place_name.ilike.%${query.search}%`;
      }
      
      dbQuery = dbQuery.or(searchConditions);
    }

    if (query.tags) {
      const filterTags = query.tags.split(',').map(tag => tag.trim());
      dbQuery = dbQuery.overlaps('tags', filterTags);
    }

    // Memory-specific filters (only apply when filtering for memories or all types)
    if (!query.type || query.type === 'memory') {
      if (query.is_highlight !== undefined) {
        dbQuery = dbQuery.eq('memories.is_highlight', query.is_highlight);
      }
      if (query.memory_type) {
        dbQuery = dbQuery.eq('memories.memory_type', query.memory_type);
      }
    }

    // Apply sorting with Memory-specific field support
    const ascending = query.sort_order === 'asc';
    switch (query.sort_by) {
      case 'captured_at':
        if (!query.type || query.type === 'memory') {
          dbQuery = dbQuery.order('memories.captured_at', { ascending, nullsFirst: false });
        } else {
          // Fallback to created_at for non-memory items
          dbQuery = dbQuery.order('created_at', { ascending });
        }
        break;
      case 'salience_score':
        if (!query.type || query.type === 'memory') {
          dbQuery = dbQuery.order('memories.salience_score', { ascending, nullsFirst: false });
        } else {
          // Fallback to created_at for non-memory items
          dbQuery = dbQuery.order('created_at', { ascending });
        }
        break;
      default:
        dbQuery = dbQuery.order(query.sort_by, { ascending });
    }

    // Apply pagination
    dbQuery = dbQuery.range(query.offset, query.offset + query.limit - 1);

    const { data, error } = await dbQuery;

    if (error) {
      console.error('Timeline items query error:', error);
      return jsonWithCors(request, { error: 'Failed to fetch timeline items' }, 500);
    }

    // Transform data to flatten Memory fields for consistent API response
    const transformedData = (data || []).map((item: any) => {
      if (item.type === 'memory' && item.memory) {
        const memory = Array.isArray(item.memory) ? item.memory[0] : item.memory;
        return {
          ...item,
          // Add Memory fields at top level for easier access
          captured_at: memory?.captured_at,
          happened_range: memory?.happened_range,
          note: memory?.note,
          title_override: memory?.title_override,
          memory_type: memory?.memory_type,
          emotion_valence: memory?.emotion_valence,
          is_highlight: memory?.is_highlight,
          salience_score: memory?.salience_score,
          place_name: memory?.place_name,
          importance_level: memory?.importance_level,
          memory_tags: memory?.tags, // Rename to avoid conflict with timeline_items.tags
          memory_status: memory?.status, // Rename to avoid conflict with timeline_items.status
          // Computed display title
          display_title: memory?.title_override || item.title,
          // Remove nested memory object
          memory: undefined
        };
      }
      return item;
    });

    return jsonWithCors(request, { 
      items: transformedData,
      count: transformedData.length,
      has_more: transformedData.length === query.limit
    });
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
