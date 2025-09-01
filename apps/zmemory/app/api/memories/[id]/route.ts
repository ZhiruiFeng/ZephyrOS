import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClientForRequest, getUserIdFromRequest } from '../../../../lib/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '../../../../lib/security';
import { 
  MemoryUpdateSchema,
  type MemoryUpdateBody
} from '../../../../lib/validators';
import { nowUTC } from '../../../../lib/time-utils';

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * @swagger
 * /api/memories/{id}:
 *   get:
 *     summary: Get a specific memory by ID
 *     description: Retrieve detailed information about a specific memory
 *     tags: [Memories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Memory ID
 *     responses:
 *       200:
 *         description: Memory details
 *       404:
 *         description: Memory not found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    // If no database configuration, return mock data
    if (!supabase) {
      const mockMemory = {
        id,
        title_override: null,
        note: 'Sample memory content',
        memory_type: 'note',
        captured_at: new Date().toISOString(),
        happened_range: null,
        emotion_valence: 3,
        emotion_arousal: 2,
        energy_delta: 1,
        place_name: 'Home',
        latitude: null,
        longitude: null,
        is_highlight: false,
        salience_score: 0.5,
        source: 'manual',
        context: 'Testing',
        mood: 7,
        importance_level: 'medium',
        related_to: [],
        category_id: null,
        tags: ['test'],
        status: 'active',
        type: 'memory',
        user_id: 'mock-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      return jsonWithCors(request, mockMemory);
    }

    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      if (process.env.NODE_ENV !== 'production') {
        // Return mock data in development
        const mockMemory = {
          id,
          note: 'Sample memory for development',
          memory_type: 'note',
          created_at: new Date().toISOString()
        };
        return jsonWithCors(request, mockMemory);
      }
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = createClientForRequest(request) || supabase;
    const { data, error } = await client
      .from('memories')
      .select(`
        *,
        category:categories(id, name, color, icon)
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return jsonWithCors(request, { error: 'Memory not found' }, 404);
      }
      console.error('Database error:', error);
      return jsonWithCors(request, { error: 'Failed to fetch memory' }, 500);
    }

    // Transform happened_range from database format back to API format
    if (data.happened_range) {
      try {
        // Parse PostgreSQL tstzrange format
        const rangeMatch = data.happened_range.match(/^\[(.+),(.+)\)$/);
        if (rangeMatch) {
          const [, start, end] = rangeMatch;
          data.happened_range = {
            start,
            end: end !== start ? end : undefined
          };
        }
      } catch (e) {
        console.warn('Failed to parse happened_range:', data.happened_range);
        data.happened_range = null;
      }
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
 * /api/memories/{id}:
 *   put:
 *     summary: Update a specific memory
 *     description: Update memory details including content, emotions, location, and metadata
 *     tags: [Memories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Memory ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               note:
 *                 type: string
 *               memory_type:
 *                 type: string
 *                 enum: [note, link, file, thought, quote, insight]
 *               emotion_valence:
 *                 type: integer
 *                 minimum: -5
 *                 maximum: 5
 *               place_name:
 *                 type: string
 *               is_highlight:
 *                 type: boolean
 *               salience_score:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *               importance_level:
 *                 type: string
 *                 enum: [low, medium, high]
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Memory updated successfully
 *       404:
 *         description: Memory not found
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 50)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const body = await request.json();
    
    console.log('=== UPDATE MEMORY API DEBUG ===');
    console.log('Memory ID:', id);
    console.log('Received body:', JSON.stringify(body, null, 2));
    
    // Validate input data
    const validationResult = MemoryUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('UPDATE MEMORY Validation failed:', validationResult.error.errors);
      return NextResponse.json(
        { error: 'Invalid memory data', details: validationResult.error.errors },
        { status: 400 }
      );
    }
    
    const memoryData = validationResult.data;
    const now = nowUTC();

    // Transform happened_range for database storage
    let transformedData = { ...memoryData };
    if (memoryData.happened_range) {
      const start = memoryData.happened_range.start;
      const end = memoryData.happened_range.end;
      transformedData.happened_range = `[${start},${end || start})` as any;
    }

    // If no database configuration, return mock response
    if (!supabase) {
      const mockUpdatedMemory = {
        id,
        ...transformedData,
        updated_at: now
      };
      return jsonWithCors(request, mockUpdatedMemory);
    }
    
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = createClientForRequest(request) || supabase;

    // Prepare update payload
    const updatePayload = {
      ...transformedData,
      updated_at: now
    };

    console.log('Updating memory with payload:', JSON.stringify(updatePayload, null, 2));

    const { data, error } = await client
      .from('memories')
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
        return jsonWithCors(request, { error: 'Memory not found' }, 404);
      }
      console.error('Database error:', error);
      return jsonWithCors(request, { error: 'Failed to update memory' }, 500);
    }

    // Transform happened_range back to API format for response
    if (data.happened_range) {
      try {
        const rangeMatch = data.happened_range.match(/^\[(.+),(.+)\)$/);
        if (rangeMatch) {
          const [, start, end] = rangeMatch;
          data.happened_range = {
            start,
            end: end !== start ? end : undefined
          };
        }
      } catch (e) {
        console.warn('Failed to parse happened_range:', data.happened_range);
        data.happened_range = null;
      }
    }

    console.log('Returning updated memory:', JSON.stringify(data, null, 2));
    return jsonWithCors(request, data);
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

/**
 * @swagger
 * /api/memories/{id}:
 *   delete:
 *     summary: Delete a specific memory
 *     description: Delete a memory by ID. This is a soft delete that sets status to 'deleted'
 *     tags: [Memories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Memory ID
 *     responses:
 *       200:
 *         description: Memory deleted successfully
 *       404:
 *         description: Memory not found
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 30)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    // If no database configuration, return mock response
    if (!supabase) {
      return jsonWithCors(request, { message: 'Memory deleted successfully (mock)' });
    }

    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = createClientForRequest(request) || supabase;
    
    // Soft delete: set status to 'deleted' instead of hard delete
    const { data, error } = await client
      .from('memories')
      .update({ 
        status: 'deleted',
        updated_at: nowUTC()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select('id, status')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return jsonWithCors(request, { error: 'Memory not found' }, 404);
      }
      console.error('Database error:', error);
      return jsonWithCors(request, { error: 'Failed to delete memory' }, 500);
    }

    if (!data) {
      return jsonWithCors(request, { error: 'Memory not found' }, 404);
    }

    return jsonWithCors(request, { message: 'Memory deleted successfully' });
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}