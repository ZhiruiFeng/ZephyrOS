import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClientForRequest, getUserIdFromRequest } from '../../../../lib/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '../../../../lib/security';
import { 
  AssetUpdateSchema,
  type AssetUpdateBody
} from '../../../../lib/validators';

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * @swagger
 * /api/assets/{id}:
 *   get:
 *     summary: Get a specific asset by ID
 *     description: Retrieve detailed information about a specific asset
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Asset details
 *       404:
 *         description: Asset not found
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
      const mockAsset = {
        id,
        url: 'https://example.com/sample.jpg',
        mime_type: 'image/jpeg',
        kind: 'image',
        duration_seconds: null,
        file_size_bytes: 1024000,
        hash_sha256: 'sample-hash',
        user_id: 'mock-user',
        created_at: new Date().toISOString()
      };
      return jsonWithCors(request, mockAsset);
    }

    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      if (process.env.NODE_ENV !== 'production') {
        const mockAsset = {
          id,
          url: 'https://example.com/dev-sample.jpg',
          mime_type: 'image/jpeg',
          kind: 'image'
        };
        return jsonWithCors(request, mockAsset);
      }
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = createClientForRequest(request) || supabase;
    const { data, error } = await client
      .from('assets')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return jsonWithCors(request, { error: 'Asset not found' }, 404);
      }
      console.error('Database error:', error);
      return jsonWithCors(request, { error: 'Failed to fetch asset' }, 500);
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
 * /api/assets/{id}:
 *   put:
 *     summary: Update a specific asset
 *     description: Update asset metadata (cannot change URL or hash)
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Asset ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mime_type:
 *                 type: string
 *               kind:
 *                 type: string
 *                 enum: [image, audio, video, document, link]
 *               duration_seconds:
 *                 type: integer
 *                 minimum: 1
 *               file_size_bytes:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Asset updated successfully
 *       404:
 *         description: Asset not found
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
    
    console.log('=== UPDATE ASSET API DEBUG ===');
    console.log('Asset ID:', id);
    console.log('Received body:', JSON.stringify(body, null, 2));
    
    // Validate input data
    const validationResult = AssetUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('UPDATE ASSET Validation failed:', validationResult.error.errors);
      return NextResponse.json(
        { error: 'Invalid asset data', details: validationResult.error.errors },
        { status: 400 }
      );
    }
    
    const assetData = validationResult.data;

    // If no database configuration, return mock response
    if (!supabase) {
      const mockUpdatedAsset = {
        id,
        ...assetData,
        url: 'https://example.com/sample.jpg',
        user_id: 'mock-user'
      };
      return jsonWithCors(request, mockUpdatedAsset);
    }
    
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = createClientForRequest(request) || supabase;

    console.log('Updating asset with payload:', JSON.stringify(assetData, null, 2));

    const { data, error } = await client
      .from('assets')
      .update(assetData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return jsonWithCors(request, { error: 'Asset not found' }, 404);
      }
      console.error('Database error:', error);
      return jsonWithCors(request, { error: 'Failed to update asset' }, 500);
    }

    console.log('Returning updated asset:', JSON.stringify(data, null, 2));
    return jsonWithCors(request, data);
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

/**
 * @swagger
 * /api/assets/{id}:
 *   delete:
 *     summary: Delete a specific asset
 *     description: Delete an asset and all its memory associations
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Asset deleted successfully
 *       404:
 *         description: Asset not found
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
      return jsonWithCors(request, { message: 'Asset deleted successfully (mock)' });
    }

    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = createClientForRequest(request) || supabase;
    
    // Check if asset exists and belongs to user
    const { data: assetCheck, error: checkError } = await client
      .from('assets')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (checkError || !assetCheck) {
      return jsonWithCors(request, { error: 'Asset not found' }, 404);
    }

    // Delete the asset (this will cascade delete memory_assets due to foreign key)
    const { error } = await client
      .from('assets')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Database error:', error);
      return jsonWithCors(request, { error: 'Failed to delete asset' }, 500);
    }

    return jsonWithCors(request, { message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}