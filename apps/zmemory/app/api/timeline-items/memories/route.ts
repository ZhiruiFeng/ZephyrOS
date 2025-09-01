import { NextRequest, NextResponse } from 'next/server';
import { createClientForRequest, getUserIdFromRequest } from '../../../../lib/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '../../../../lib/security';
import { MemoriesQuerySchema, type MemoriesQuery } from '../../../../lib/validators';
import { nowUTC } from '../../../../lib/time-utils';

/**
 * @swagger
 * /api/timeline-items/memories:
 *   get:
 *     summary: Get memory timeline items with Memory-specific filtering
 *     description: Retrieve memory timeline items with rich filtering options including emotional, temporal, and salience-based filtering
 *     tags: [Timeline Items, Memory Integration]
 *     parameters:
 *       - in: query
 *         name: memory_type
 *         schema:
 *           type: string
 *           enum: [note, link, file, thought, quote, insight]
 *         description: Filter by memory type
 *       - in: query
 *         name: emotion_valence_min
 *         schema:
 *           type: integer
 *           minimum: -5
 *           maximum: 5
 *         description: Minimum emotion valence
 *       - in: query
 *         name: emotion_valence_max
 *         schema:
 *           type: integer
 *           minimum: -5
 *           maximum: 5
 *         description: Maximum emotion valence
 *       - in: query
 *         name: is_highlight
 *         schema:
 *           type: boolean
 *         description: Filter by highlight status
 *       - in: query
 *         name: min_salience
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *         description: Minimum salience score
 *       - in: query
 *         name: place_name
 *         schema:
 *           type: string
 *         description: Filter by place name
 *       - in: query
 *         name: importance_level
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *         description: Filter by importance level
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter memories captured after this date
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter memories captured before this date
 *       - in: query
 *         name: render_on_timeline
 *         schema:
 *           type: boolean
 *         description: Filter by timeline rendering preference
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Maximum number of memories to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of memories to skip
 *     responses:
 *       200:
 *         description: List of memory timeline items with Memory-specific data
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = createClientForRequest(request);
    if (!client) {
      return jsonWithCors(request, { error: 'Supabase not configured' }, 500);
    }

    const { searchParams } = new URL(request.url);
    
    // Parse and validate query parameters
    const queryResult = MemoriesQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryResult.error.errors },
        { status: 400 }
      );
    }

    const query = queryResult.data;

    console.log('=== MEMORY TIMELINE ITEMS API DEBUG ===');
    console.log('Query params:', JSON.stringify(query, null, 2));

    // Build enhanced query that joins timeline_items with memories table
    let dbQuery = client
      .from('timeline_items')
      .select(`
        *,
        category:categories(id, name, color, icon),
        memory:memories!inner(
          captured_at,
          happened_range,
          note,
          title_override,
          memory_type,
          emotion_valence,
          emotion_arousal,
          energy_delta,
          place_name,
          latitude,
          longitude,
          is_highlight,
          salience_score,
          source,
          context,
          mood,
          importance_level,
          related_to,
          tags,
          status
        )
      `)
      .eq('user_id', userId)
      .eq('type', 'memory');

    // Apply Memory-specific filters
    if (query.memory_type) {
      dbQuery = dbQuery.eq('memories.memory_type', query.memory_type);
    }
    if (query.min_emotion_valence !== undefined) {
      dbQuery = dbQuery.gte('memories.emotion_valence', query.min_emotion_valence);
    }
    if (query.max_emotion_valence !== undefined) {
      dbQuery = dbQuery.lte('memories.emotion_valence', query.max_emotion_valence);
    }
    // Note: emotion_arousal and energy_delta filters are not available in MemoriesQuerySchema
    // These filters are commented out until the schema is updated
    /*
    if (query.emotion_arousal_min !== undefined) {
      dbQuery = dbQuery.gte('memories.emotion_arousal', query.emotion_arousal_min);
    }
    if (query.emotion_arousal_max !== undefined) {
      dbQuery = dbQuery.lte('memories.emotion_arousal', query.emotion_arousal_max);
    }
    if (query.energy_delta_min !== undefined) {
      dbQuery = dbQuery.gte('memories.energy_delta', query.energy_delta_min);
    }
    if (query.energy_delta_max !== undefined) {
      dbQuery = dbQuery.lte('memories.energy_delta', query.energy_delta_max);
    }
    */
    if (query.is_highlight !== undefined) {
      dbQuery = dbQuery.eq('memories.is_highlight', query.is_highlight);
    }
    if (query.min_salience !== undefined) {
      dbQuery = dbQuery.gte('memories.salience_score', query.min_salience);
    }
    // Note: max_salience filter is not available in MemoriesQuerySchema
    // if (query.max_salience !== undefined) {
    //   dbQuery = dbQuery.lte('memories.salience_score', query.max_salience);
    // }
    if (query.place_name) {
      dbQuery = dbQuery.ilike('memories.place_name', `%${query.place_name}%`);
    }
    if (query.importance_level) {
      dbQuery = dbQuery.eq('memories.importance_level', query.importance_level);
    }
    // Note: mood_min and mood_max filters are not available in MemoriesQuerySchema
    // Only min_mood is available
    if (query.min_mood !== undefined) {
      dbQuery = dbQuery.gte('memories.mood', query.min_mood);
    }
    // Note: from_date and to_date filters are not available in MemoriesQuerySchema
    // Use captured_from and captured_to instead
    if (query.captured_from) {
      dbQuery = dbQuery.gte('memories.captured_at', query.captured_from);
    }
    if (query.captured_to) {
      dbQuery = dbQuery.lte('memories.captured_at', query.captured_to);
    }
    // Note: render_on_timeline filter is not available in MemoriesQuerySchema
    // if (query.render_on_timeline !== undefined) {
    //   dbQuery = dbQuery.eq('render_on_timeline', query.render_on_timeline);
    // }
    if (query.tags) {
      // tags is a comma-separated string in MemoriesQuerySchema
      const tagArray = query.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      if (tagArray.length > 0) {
        dbQuery = dbQuery.overlaps('memories.tags', tagArray);
      }
    }
    if (query.status) {
      dbQuery = dbQuery.eq('memories.status', query.status);
    }
    if (query.category_id) {
      dbQuery = dbQuery.eq('category_id', query.category_id);
    }

    // Apply sorting - enhanced to support Memory-specific fields
    const sortField = query.sort_by;
    const ascending = query.sort_order === 'asc';
    
    switch (sortField) {
      case 'captured_at':
        dbQuery = dbQuery.order('memories.captured_at', { ascending });
        break;
      case 'salience_score':
        dbQuery = dbQuery.order('memories.salience_score', { ascending });
        break;
      case 'emotion_valence':
        dbQuery = dbQuery.order('memories.emotion_valence', { ascending });
        break;
      default:
        // Default timeline_items fields or handle importance_level
        if ((sortField as string) === 'importance_level') {
          dbQuery = dbQuery.order('memories.importance_level', { ascending });
        } else {
          dbQuery = dbQuery.order(sortField, { ascending });
        }
    }

    // Apply pagination
    dbQuery = dbQuery.range(query.offset, query.offset + query.limit - 1);

    const { data, error } = await dbQuery;

    if (error) {
      console.error('Memory timeline items query error:', error);
      return jsonWithCors(request, { error: 'Failed to fetch memory timeline items' }, 500);
    }

    // Transform the data to flatten memory data and add computed fields
    const transformedData = (data || []).map(item => {
      const memory = Array.isArray(item.memory) ? item.memory[0] : item.memory;
      return {
        ...item,
        // Flatten memory data to top level
        captured_at: memory?.captured_at,
        happened_range: memory?.happened_range,
        note: memory?.note,
        title_override: memory?.title_override,
        memory_type: memory?.memory_type,
        emotion_valence: memory?.emotion_valence,
        emotion_arousal: memory?.emotion_arousal,
        energy_delta: memory?.energy_delta,
        place_name: memory?.place_name,
        latitude: memory?.latitude,
        longitude: memory?.longitude,
        is_highlight: memory?.is_highlight,
        salience_score: memory?.salience_score,
        source: memory?.source,
        context: memory?.context,
        mood: memory?.mood,
        importance_level: memory?.importance_level,
        related_to: memory?.related_to,
        memory_tags: memory?.tags, // Rename to avoid conflict with timeline_items.tags
        memory_status: memory?.status, // Rename to avoid conflict with timeline_items.status
        // Add computed display title
        display_title: memory?.title_override || item.title,
        // Remove the nested memory object
        memory: undefined
      };
    });

    console.log(`Found ${transformedData.length} memory timeline items`);

    return jsonWithCors(request, { 
      items: transformedData,
      count: transformedData.length,
      has_more: transformedData.length === query.limit
    });

  } catch (error) {
    console.error('Memory timeline items API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}