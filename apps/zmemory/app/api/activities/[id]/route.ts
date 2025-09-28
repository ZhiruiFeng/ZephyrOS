import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClientForRequest, getUserIdFromRequest } from '@/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '@/lib/security';
import { 
  ActivityUpdateSchema,
  type ActivityUpdateBody
} from '@/validation';
import { nowUTC } from '@/lib/time-utils';

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

/**
 * @swagger
 * /api/activities/{id}:
 *   get:
 *     summary: Get a specific activity
 *     description: Retrieve a single activity by ID
 *     tags: [Activities]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Activity ID
 *     responses:
 *       200:
 *         description: Activity details
 *       404:
 *         description: Activity not found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const { id } = await params;

    if (!supabase) {
      // Return mock activity
      const mockActivity = {
        id,
        title: '示例活动',
        description: '这是一个示例活动',
        activity_type: 'other',
        status: 'completed',
        mood_after: 8,
        satisfaction_level: 9,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      return jsonWithCors(request, mockActivity);
    }

    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = createClientForRequest(request) || supabase;

    const { data, error } = await client
      .from('activities')
      .select(`
        *,
        category:categories(id, name, color, icon)
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return jsonWithCors(request, { error: 'Activity not found' }, 404);
      }
      console.error('Database error:', error);
      return jsonWithCors(request, { error: 'Failed to fetch activity' }, 500);
    }

    return jsonWithCors(request, data);
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

/**
 * @swagger
 * /api/activities/{id}:
 *   put:
 *     summary: Update an activity
 *     description: Update an existing activity
 *     tags: [Activities]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Activity ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               mood_after:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *     responses:
 *       200:
 *         description: Activity updated successfully
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 50)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const { id } = await params;
    const body = await request.json();

    console.log('=== UPDATE ACTIVITY API DEBUG ===');
    console.log('Activity ID:', id);
    console.log('Received body:', JSON.stringify(body, null, 2));

    // Validate request body
    const validationResult = ActivityUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('UPDATE ACTIVITY Validation failed:', validationResult.error.errors);
      return NextResponse.json(
        { error: 'Invalid activity data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    if (!supabase) {
      // Return mock updated activity
      const mockActivity = {
        id,
        ...updateData,
        updated_at: nowUTC()
      };
      return jsonWithCors(request, mockActivity);
    }

    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = createClientForRequest(request) || supabase;

    // Add updated_at timestamp
    const updatePayload = {
      ...updateData,
      updated_at: nowUTC()
    };

    console.log('Updating activity with payload:', JSON.stringify(updatePayload, null, 2));

    const { data, error } = await client
      .from('activities')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', userId)
      .select(`
        *,
        category:categories(id, name, color, icon)
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return jsonWithCors(request, { error: 'Activity not found' }, 404);
      }
      console.error('Database error:', error);
      return jsonWithCors(request, { error: 'Failed to update activity' }, 500);
    }

    console.log('Returning updated activity:', JSON.stringify(data, null, 2));
    return jsonWithCors(request, data);
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

/**
 * @swagger
 * /api/activities/{id}:
 *   delete:
 *     summary: Delete an activity
 *     description: Delete an existing activity
 *     tags: [Activities]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Activity ID
 *     responses:
 *       200:
 *         description: Activity deleted successfully
 *       404:
 *         description: Activity not found
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 30)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const { id } = await params;

    if (!supabase) {
      return jsonWithCors(request, { message: 'Activity deleted successfully' });
    }

    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = createClientForRequest(request) || supabase;

    const { error } = await client
      .from('activities')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Database error:', error);
      return jsonWithCors(request, { error: 'Failed to delete activity' }, 500);
    }

    return jsonWithCors(request, { message: 'Activity deleted successfully' });
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}
