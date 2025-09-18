import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClientForRequest, getUserIdFromRequest } from '../../../lib/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '../../../lib/security';
import { 
  MemoryCreateSchema,
  MemoriesQuerySchema,
  type MemoryCreateBody,
  type MemoriesQuery
} from '../../../lib/validators';
import { nowUTC } from '../../../lib/time-utils';

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Mock data for development/testing
const generateMockMemories = () => [
  {
    id: '1',
    title: '和朋友一起爬山',
    description: '今天和朋友一起爬山，风景很美，心情特别好',
    title_override: null,
    note: '今天和朋友一起爬山，风景很美，心情特别好',
    memory_type: 'note',
    captured_at: new Date(Date.now() - 3600000).toISOString(),
    happened_range: null,
    emotion_valence: 4,
    emotion_arousal: 3,
    energy_delta: 2,
    place_name: '香山公园',
    latitude: 39.9926,
    longitude: 116.1929,
    is_highlight: true,
    salience_score: 0.8,
    category_id: null,
    tags: ['户外', '运动', '朋友'],
    status: 'active',
    type: 'memory',
    user_id: 'mock-user',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: '2', 
    title: '阅读笔记',
    description: '读《原子习惯》第三章，关于习惯循环的概念很有启发',
    title_override: '阅读笔记',
    note: '读《原子习惯》第三章，关于习惯循环的概念很有启发',
    memory_type: 'quote',
    captured_at: new Date(Date.now() - 7200000).toISOString(),
    happened_range: {
      start: new Date(Date.now() - 9000000).toISOString(),
      end: new Date(Date.now() - 7200000).toISOString()
    },
    emotion_valence: 2,
    emotion_arousal: 1,
    energy_delta: 1,
    place_name: null,
    latitude: null,
    longitude: null,
    is_highlight: false,
    salience_score: 0.6,
    category_id: null,
    tags: ['学习', '读书', '习惯'],
    status: 'active',
    type: 'memory',
    user_id: 'mock-user',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString()
  }
];

/**
 * @swagger
 * /api/memories:
 *   get:
 *     summary: Get memories with advanced filtering and search
 *     description: Retrieve memories with comprehensive filtering by type, emotions, location, dates, and more
 *     tags: [Memories]
 *     parameters:
 *       - in: query
 *         name: memory_type
 *         schema:
 *           type: string
 *           enum: [note, link, file, thought, quote, insight]
 *         description: Filter by memory type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, archived, deleted]
 *         description: Filter by memory status
 *       - in: query
 *         name: importance_level
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *         description: Filter by importance level
 *       - in: query
 *         name: is_highlight
 *         schema:
 *           type: boolean
 *         description: Filter highlight memories only
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Full-text search across memory content
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Filter by tags (comma-separated)
 *       - in: query
 *         name: place_name
 *         schema:
 *           type: string
 *         description: Filter by location name
 *       - in: query
 *         name: min_emotion_valence
 *         schema:
 *           type: integer
 *           minimum: -5
 *           maximum: 5
 *         description: Minimum emotion valence (-5 to 5)
 *       - in: query
 *         name: min_salience
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *         description: Minimum salience score (0.0 to 1.0)
 *     responses:
 *       200:
 *         description: List of memories matching filters
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting (per-route key to avoid cross-endpoint contention)
    const rlKey = `${getClientIP(request)}:GET:/api/memories`;
    if (isRateLimited(rlKey, 15 * 60 * 1000, 300)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const { searchParams } = new URL(request.url);
    
    // Parse and validate query parameters
    const queryResult = MemoriesQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!queryResult.success) {
      return jsonWithCors(request, { error: 'Invalid query parameters', details: queryResult.error.errors }, 400);
    }

    const query = queryResult.data;

    // If Supabase is not configured, return filtered mock data
    if (!supabase) {
      let memories = generateMockMemories();
      
      // Apply basic filters to mock data
      if (query.memory_type) {
        memories = memories.filter(m => m.memory_type === query.memory_type);
      }
      if (query.status) {
        memories = memories.filter(m => m.status === query.status);
      }
      if (query.is_highlight !== undefined) {
        memories = memories.filter(m => m.is_highlight === query.is_highlight);
      }
      if (query.search) {
        const searchLower = query.search.toLowerCase();
        memories = memories.filter(m => 
          m.note.toLowerCase().includes(searchLower) ||
          (m.place_name && m.place_name.toLowerCase().includes(searchLower))
        );
      }
      
      return jsonWithCors(request, memories.slice(query.offset, query.offset + query.limit));
    }

    // Enforce authentication
    let userId = await getUserIdFromRequest(request);
    if (!userId) {
      if (process.env.NODE_ENV !== 'production') {
        userId = 'dev-user-123';
      } else {
        return jsonWithCors(request, { error: 'Unauthorized' }, 401);
      }
    }

    // Use service role client to bypass RLS (same issue as POST)
    const client = supabase;
    // Build comprehensive Supabase query
    let dbQuery = client
      .from('memories')
      .select(`
        *,
        category:categories(id, name, color, icon)
      `)
      .eq('user_id', userId);

    // Apply filters
    if (query.memory_type) {
      dbQuery = dbQuery.eq('memory_type', query.memory_type);
    }
    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status);
    } else {
      // Default to active memories only so soft-deleted/archived don't show up
      dbQuery = dbQuery.eq('status', 'active');
    }

    if (query.is_highlight !== undefined) {
      dbQuery = dbQuery.eq('is_highlight', query.is_highlight);
    }
    
    // Date range filters
    if (query.captured_from) {
      dbQuery = dbQuery.gte('captured_at', query.captured_from);
    }
    if (query.captured_to) {
      dbQuery = dbQuery.lte('captured_at', query.captured_to);
    }
    
    // Location filters
    if (query.place_name) {
      dbQuery = dbQuery.ilike('place_name', `%${query.place_name}%`);
    }
    if (query.near_lat && query.near_lng && query.distance_km) {
      // Simple bounding box approximation for location filtering
      const latRange = query.distance_km / 111; // Rough km to degree conversion
      const lngRange = query.distance_km / (111 * Math.cos(query.near_lat * Math.PI / 180));
      
      dbQuery = dbQuery
        .gte('latitude', query.near_lat - latRange)
        .lte('latitude', query.near_lat + latRange)
        .gte('longitude', query.near_lng - lngRange)
        .lte('longitude', query.near_lng + lngRange);
    }
    
    // Emotional/rating filters
    if (query.min_emotion_valence !== undefined) {
      dbQuery = dbQuery.gte('emotion_valence', query.min_emotion_valence);
    }
    if (query.max_emotion_valence !== undefined) {
      dbQuery = dbQuery.lte('emotion_valence', query.max_emotion_valence);
    }
    if (query.min_salience !== undefined) {
      dbQuery = dbQuery.gte('salience_score', query.min_salience);
    }

    
    // Category and tags
    if (query.category_id) {
      dbQuery = dbQuery.eq('category_id', query.category_id);
    }
    if (query.tags) {
      const filterTags = query.tags.split(',').map(tag => tag.trim());
      dbQuery = dbQuery.overlaps('tags', filterTags);
    }

    
    // Full-text search
    if (query.search) {
      switch (query.search_fields) {
        case 'note':
          dbQuery = dbQuery.ilike('note', `%${query.search}%`);
          break;
        case 'place_name':
          dbQuery = dbQuery.ilike('place_name', `%${query.search}%`);
          break;
        case 'all':
        default:
          dbQuery = dbQuery.or(
            `note.ilike.%${query.search}%,place_name.ilike.%${query.search}%`
          );
      }
    }

    // Apply sorting
    const ascending = query.sort_order === 'asc';
    switch (query.sort_by) {
      case 'happened_at':
        // Sort by the start of happened_range, fallback to captured_at
        dbQuery = dbQuery.order('captured_at', { ascending, nullsFirst: false });
        break;
      case 'salience_score':
        dbQuery = dbQuery.order('salience_score', { ascending, nullsFirst: false });
        break;
      case 'emotion_valence':
        dbQuery = dbQuery.order('emotion_valence', { ascending, nullsFirst: false });
        break;

      case 'updated_at':
        dbQuery = dbQuery.order('updated_at', { ascending });
        break;
      case 'captured_at':
      default:
        dbQuery = dbQuery.order('captured_at', { ascending });
    }

    // Apply pagination
    dbQuery = dbQuery.range(query.offset, query.offset + query.limit - 1);

    const { data, error } = await dbQuery;
    
    if (error) {
      console.error('Database error:', error);
      if (process.env.NODE_ENV !== 'production') {
        return jsonWithCors(request, generateMockMemories().slice(query.offset, query.offset + query.limit));
      }
      return NextResponse.json(
        { error: 'Failed to fetch memories' },
        { status: 500 }
      );
    }

    const safeData = (data || []).map((m: any) => ({
      ...m,
      note: m?.note ?? '',
      title: m?.title ?? null,
      title_override: m?.title_override ?? null,
    }));
    return jsonWithCors(request, safeData);
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

/**
 * @swagger
 * /api/memories:
 *   post:
 *     summary: Create a new memory
 *     description: Create a new memory with rich metadata including emotions, location, and context
 *     tags: [Memories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 description: Title of the memory
 *               note:
 *                 type: string
 *                 description: Optional content/details of the memory
 *               memory_type:
 *                 type: string
 *                 enum: [note, link, file, thought, quote, insight]
 *                 default: note
 *               emotion_valence:
 *                 type: integer
 *                 minimum: -5
 *                 maximum: 5
 *               place_name:
 *                 type: string
 *               is_highlight:
 *                 type: boolean
 *                 default: false
 *               importance_level:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 default: medium
 *             required: [title]
 *     responses:
 *       201:
 *         description: Memory created successfully
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting (per-route key)
    const postKey = `${getClientIP(request)}:POST:/api/memories`;
    if (isRateLimited(postKey, 15 * 60 * 1000, 50)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const body = await request.json();
    
    // Validate request body
    const validationResult = MemoryCreateSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('CREATE MEMORY Validation failed:', validationResult.error.errors);
      return jsonWithCors(request, { error: 'Invalid memory data', details: validationResult.error.errors }, 400);
    }

    const memoryData = validationResult.data;
    const now = nowUTC();

    // Transform happened_range for database storage
    let transformedData = { ...memoryData };
    if (memoryData.happened_range) {
      // Convert to PostgreSQL tstzrange format
      const start = memoryData.happened_range.start;
      const end = memoryData.happened_range.end;
      transformedData.happened_range = `[${start},${end || start})` as any;
    }

    // If Supabase is not configured, return mock response
    if (!supabase) {
      // Avoid duplicate 'title' key when spreading transformedData
      const { title: _ignoredTitle, ...rest } = transformedData as any;
      const mockMemory = {
        id: Date.now().toString(),
        title: (transformedData as any).title || (transformedData as any).title_override || transformedData.note?.substring(0, 100) || 'Untitled',
        description: (transformedData as any).description ?? null,
        ...rest,
        captured_at: transformedData.captured_at || now,
        user_id: 'mock-user',
        created_at: now,
        updated_at: now,
        tags: transformedData.tags || [],
        status: 'active',
        type: 'memory'
      };
      return jsonWithCors(request, mockMemory, 201);
    }

    // Enforce authentication
    let userId = await getUserIdFromRequest(request);
    if (!userId) {
      if (process.env.NODE_ENV !== 'production') {
        userId = 'dev-user-123';
      } else {
        return jsonWithCors(request, { error: 'Unauthorized' }, 401);
      }
    }

    // Use service role client to bypass RLS during insert (trigger needs elevated permissions)
    const client = supabase;
    // Create memory directly - trigger will sync to timeline_items
    // Note: Only include fields that exist in the memories table schema
    const memoryPayload = {
      title: transformedData.title || transformedData.note?.substring(0, 100) || 'Untitled',
      description: (transformedData as any).description ?? null,
      note: transformedData.note,
      title_override: transformedData.title, // Store title as title_override for DB schema
      memory_type: transformedData.memory_type || 'note',
      
      // Time fields
      captured_at: transformedData.captured_at || now,
      happened_range: transformedData.happened_range,
      
      // Emotional/energy fields (these exist in DB)
      emotion_valence: transformedData.emotion_valence,
      emotion_arousal: transformedData.emotion_arousal,
      energy_delta: transformedData.energy_delta,
      
      // Location fields
      place_name: transformedData.place_name,
      latitude: transformedData.latitude,
      longitude: transformedData.longitude,
      
      // Highlight/salience fields
      is_highlight: transformedData.is_highlight || false,
      salience_score: transformedData.salience_score,
      
      // Organization
      category_id: transformedData.category_id || null,
      tags: transformedData.tags || [],
      
      // User ownership
      user_id: userId,
      
      // Status
      status: 'active',
      
      // Supertype/subtype relationship
      type: 'memory'
      
      // Note: 'mood', 'source', 'context', 'importance_level', 'related_to' are NOT included
      // as they don't exist in the memories table schema
    };

    const { data, error } = await client
      .from('memories')
      .insert(memoryPayload)
      .select('*')
      .single();

    if (error) {
      console.error('Database error:', error);
      return jsonWithCors(request, { error: 'Failed to create memory' }, 500);
    }

    return jsonWithCors(request, data, 201);
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}
