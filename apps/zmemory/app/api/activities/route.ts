import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClientForRequest, getUserIdFromRequest } from '../../../lib/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '../../../lib/security';
import { 
  ActivityCreateSchema, 
  ActivityUpdateSchema,
  ActivitiesQuerySchema,
  type ActivityCreateBody,
  type ActivitiesQuery
} from '../../../lib/validators';
import { nowUTC } from '../../../lib/time-utils';

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Mock data for development
const generateMockActivities = () => [
  {
    id: '1',
    title: '晨间瑜伽',
    description: '20分钟的流瑜伽练习',
    activity_type: 'exercise',
    started_at: new Date(Date.now() - 3600000).toISOString(),
    ended_at: new Date(Date.now() - 2400000).toISOString(),
    duration_minutes: 20,
    mood_before: 6,
    mood_after: 8,
    energy_before: 5,
    energy_after: 8,
    satisfaction_level: 9,
    intensity_level: 'moderate',
    location: '家里客厅',
    weather: '晴朗',
    companions: [],
    notes: '很放松的练习',
    insights: '坚持练习能改善心情',
    gratitude: '感谢身体的配合',
    status: 'completed',
    tags: ['健康', '晨练'],
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 2400000).toISOString()
  },
  {
    id: '2',
    title: '读书时光',
    description: '阅读《原则》',
    activity_type: 'reading',
    started_at: new Date(Date.now() - 7200000).toISOString(),
    ended_at: new Date(Date.now() - 5400000).toISOString(),
    duration_minutes: 30,
    mood_before: 7,
    mood_after: 8,
    energy_before: 6,
    energy_after: 7,
    satisfaction_level: 8,
    intensity_level: 'low',
    location: '书房',
    companions: [],
    notes: '学到了很多投资理念',
    insights: '读书是最好的投资',
    status: 'completed',
    tags: ['学习', '投资'],
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 5400000).toISOString()
  }
];

/**
 * @swagger
 * /api/activities:
 *   get:
 *     summary: Get activities with optional filtering
 *     description: Retrieve activities with support for filtering by type, status, mood ratings, and more
 *     tags: [Activities]
 *     parameters:
 *       - in: query
 *         name: activity_type
 *         schema:
 *           type: string
 *           enum: [exercise, meditation, reading, music, socializing, gaming, walking, cooking, rest, creative, learning, other]
 *         description: Filter by activity type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, completed, cancelled]
 *         description: Filter by activity status
 *       - in: query
 *         name: intensity_level
 *         schema:
 *           type: string
 *           enum: [low, moderate, high]
 *         description: Filter by intensity level
 *       - in: query
 *         name: min_satisfaction
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 10
 *         description: Minimum satisfaction level
 *       - in: query
 *         name: min_mood_after
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 10
 *         description: Minimum mood after rating
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Activities started after this date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Activities started before this date
 *     responses:
 *       200:
 *         description: List of activities
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const { searchParams } = new URL(request.url);
    
    // Parse and validate query parameters
    const queryResult = ActivitiesQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryResult.error.errors },
        { status: 400 }
      );
    }

    const query = queryResult.data;

    // If Supabase is not configured, return filtered mock data
    if (!supabase) {
      let activities = generateMockActivities();

      // Apply basic filters
      if (query.activity_type) {
        activities = activities.filter(a => a.activity_type === query.activity_type);
      }
      if (query.status) {
        activities = activities.filter(a => a.status === query.status);
      }
      if (query.search) {
        const searchLower = query.search.toLowerCase();
        activities = activities.filter(a => 
          a.title.toLowerCase().includes(searchLower) ||
          (a.description && a.description.toLowerCase().includes(searchLower))
        );
      }

      return jsonWithCors(request, activities.slice(query.offset, query.offset + query.limit));
    }

    // Enforce auth
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      if (process.env.NODE_ENV !== 'production') {
        return jsonWithCors(request, generateMockActivities().slice(query.offset, query.offset + query.limit));
      }
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = createClientForRequest(request) || supabase;

    // Build Supabase query
    let dbQuery = client
      .from('activities')
      .select(`
        *,
        category:categories(id, name, color, icon)
      `)
      .eq('user_id', userId);

    // Apply filters
    if (query.activity_type) {
      dbQuery = dbQuery.eq('activity_type', query.activity_type);
    }
    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status);
    }
    if (query.intensity_level) {
      dbQuery = dbQuery.eq('intensity_level', query.intensity_level);
    }
    if (query.location) {
      dbQuery = dbQuery.ilike('location', `%${query.location}%`);
    }
    if (query.min_satisfaction) {
      dbQuery = dbQuery.gte('satisfaction_level', query.min_satisfaction);
    }
    if (query.min_mood_after) {
      dbQuery = dbQuery.gte('mood_after', query.min_mood_after);
    }
    if (query.from) {
      dbQuery = dbQuery.gte('started_at', query.from);
    }
    if (query.to) {
      dbQuery = dbQuery.lte('started_at', query.to);
    }
    if (query.search) {
      dbQuery = dbQuery.or(`title.ilike.%${query.search}%,description.ilike.%${query.search}%,notes.ilike.%${query.search}%`);
    }
    if (query.tags) {
      const filterTags = query.tags.split(',').map(tag => tag.trim());
      dbQuery = dbQuery.overlaps('tags', filterTags);
    }
    if (query.category_id) {
      dbQuery = dbQuery.eq('category_id', query.category_id);
    }

    // Apply sorting
    const ascending = query.sort_order === 'asc';
    switch (query.sort_by) {
      case 'started_at':
        dbQuery = dbQuery.order('started_at', { ascending, nullsFirst: false });
        break;
      case 'satisfaction_level':
        dbQuery = dbQuery.order('satisfaction_level', { ascending, nullsFirst: false });
        break;
      case 'mood_after':
        dbQuery = dbQuery.order('mood_after', { ascending, nullsFirst: false });
        break;
      case 'title':
        dbQuery = dbQuery.order('title', { ascending });
        break;
      default:
        dbQuery = dbQuery.order('created_at', { ascending });
    }

    // Apply pagination
    dbQuery = dbQuery.range(query.offset, query.offset + query.limit - 1);

    const { data, error } = await dbQuery;
    
    if (error) {
      console.error('Database error:', error);
      if (process.env.NODE_ENV !== 'production') {
        return jsonWithCors(request, generateMockActivities().slice(query.offset, query.offset + query.limit));
      }
      return NextResponse.json(
        { error: 'Failed to fetch activities' },
        { status: 500 }
      );
    }

    return jsonWithCors(request, data || []);
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

/**
 * @swagger
 * /api/activities:
 *   post:
 *     summary: Create a new activity
 *     description: Create a new activity record with mood, energy, and experience tracking
 *     tags: [Activities]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 500
 *               description:
 *                 type: string
 *               activity_type:
 *                 type: string
 *                 enum: [exercise, meditation, reading, music, socializing, gaming, walking, cooking, rest, creative, learning, other]
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 50)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const body = await request.json();
    
    console.log('=== CREATE ACTIVITY API DEBUG ===');
    console.log('Received body:', JSON.stringify(body, null, 2));
    
    // Validate request body
    const validationResult = ActivityCreateSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('CREATE ACTIVITY Validation failed:', validationResult.error.errors);
      return NextResponse.json(
        { error: 'Invalid activity data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const activityData = validationResult.data;
    const now = nowUTC();

    // If Supabase is not configured, return mock response
    if (!supabase) {
      const mockActivity = {
        id: Date.now().toString(),
        ...activityData,
        created_at: now,
        updated_at: now
      };
      return jsonWithCors(request, mockActivity, 201);
    }

    // Enforce auth
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = createClientForRequest(request) || supabase;

    const insertPayload = {
      ...activityData,
      created_at: now,
      updated_at: now,
      user_id: userId,
    };

    console.log('Creating activity with payload:', JSON.stringify(insertPayload, null, 2));

    const { data, error } = await client
      .from('activities')
      .insert(insertPayload)
      .select(`
        *,
        category:categories(id, name, color, icon)
      `)
      .single();

    if (error) {
      console.error('Database error:', error);
      return jsonWithCors(request, { error: 'Failed to create activity' }, 500);
    }

    console.log('Returning created activity:', JSON.stringify(data, null, 2));
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
