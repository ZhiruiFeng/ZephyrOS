import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClientForRequest, getUserIdFromRequest } from '../../../../../lib/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '../../../../../lib/security';
import { 
  MemoryAssetCreateSchema,
  type MemoryAssetCreateBody
} from '../../../../../lib/validators';
import { nowUTC } from '../../../../../lib/time-utils';

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Mock data for development/testing
const generateMockAssets = (memoryId: string) => [
  {
    memory_id: memoryId,
    asset_id: 'asset-123',
    order_index: 0,
    caption: 'Beautiful sunset view from the hike',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    asset: {
      id: 'asset-123',
      url: 'https://example.com/sunset.jpg',
      mime_type: 'image/jpeg',
      kind: 'image',
      duration_seconds: null,
      file_size_bytes: 2048576,
      hash_sha256: 'abc123def456...',
      created_at: new Date(Date.now() - 3600000).toISOString()
    }
  },
  {
    memory_id: memoryId,
    asset_id: 'asset-456',
    order_index: 1,
    caption: 'Voice note from the experience',
    created_at: new Date(Date.now() - 3500000).toISOString(),
    asset: {
      id: 'asset-456',
      url: 'https://example.com/voice-note.m4a',
      mime_type: 'audio/m4a',
      kind: 'audio',
      duration_seconds: 45,
      file_size_bytes: 512000,
      hash_sha256: 'def456ghi789...',
      created_at: new Date(Date.now() - 3500000).toISOString()
    }
  }
];

/**
 * @swagger
 * /api/memories/{id}/assets:
 *   get:
 *     summary: Get memory assets
 *     description: Retrieve all assets attached to a specific memory
 *     tags: [Memory Assets]
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
 *         description: List of memory assets with populated asset data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: memoryId } = await params;
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    // If Supabase is not configured, return mock data
    if (!supabase) {
      return jsonWithCors(request, generateMockAssets(memoryId));
    }

    // Enforce authentication
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      if (process.env.NODE_ENV !== 'production') {
        return jsonWithCors(request, generateMockAssets(memoryId));
      }
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = createClientForRequest(request) || supabase;

    // First verify the memory belongs to the user
    const { data: memoryCheck, error: memoryError } = await client
      .from('memories')
      .select('id')
      .eq('id', memoryId)
      .eq('user_id', userId)
      .single();

    if (memoryError || !memoryCheck) {
      return jsonWithCors(request, { error: 'Memory not found' }, 404);
    }

    // Get assets with full asset data
    const { data, error } = await client
      .from('memory_assets')
      .select(`
        *,
        asset:assets (
          id,
          url,
          mime_type,
          kind,
          duration_seconds,
          file_size_bytes,
          hash_sha256,
          created_at
        )
      `)
      .eq('memory_id', memoryId)
      .order('order_index');

    if (error) {
      console.error('Database error:', error);
      if (process.env.NODE_ENV !== 'production') {
        return jsonWithCors(request, generateMockAssets(memoryId));
      }
      return NextResponse.json(
        { error: 'Failed to fetch memory assets' },
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
 * /api/memories/{id}/assets:
 *   post:
 *     summary: Attach an asset to a memory
 *     description: Create a new asset attachment for a memory
 *     tags: [Memory Assets]
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
 *               asset_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the asset to attach
 *               order_index:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *                 description: Position in the asset list
 *               caption:
 *                 type: string
 *                 description: Caption or description for this asset in the memory
 *             required: [asset_id]
 *     responses:
 *       201:
 *         description: Asset attached successfully
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: memoryId } = await params;
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 50)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const body = await request.json();
    
    console.log('=== ATTACH ASSET TO MEMORY API DEBUG ===');
    console.log('Memory ID:', memoryId);
    console.log('Received body:', JSON.stringify(body, null, 2));
    
    // Validate request body
    const validationResult = MemoryAssetCreateSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('ATTACH ASSET Validation failed:', validationResult.error.errors);
      return NextResponse.json(
        { error: 'Invalid asset attachment data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const assetData = validationResult.data;
    const now = nowUTC();

    // If Supabase is not configured, return mock response
    if (!supabase) {
      const mockAsset = {
        memory_id: memoryId,
        ...assetData,
        created_at: now
      };
      return jsonWithCors(request, mockAsset, 201);
    }

    // Enforce authentication
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = createClientForRequest(request) || supabase;

    // Verify memory belongs to user
    const { data: memoryCheck, error: memoryError } = await client
      .from('memories')
      .select('id')
      .eq('id', memoryId)
      .eq('user_id', userId)
      .single();

    if (memoryError || !memoryCheck) {
      return jsonWithCors(request, { error: 'Memory not found' }, 404);
    }

    // Verify asset exists and belongs to user
    const { data: assetCheck, error: assetError } = await client
      .from('assets')
      .select('id')
      .eq('id', assetData.asset_id)
      .eq('user_id', userId)
      .single();

    if (assetError || !assetCheck) {
      return jsonWithCors(request, { error: 'Asset not found' }, 404);
    }

    // Check if asset is already attached (prevent duplicates)
    const { data: existingAttachment } = await client
      .from('memory_assets')
      .select('memory_id')
      .eq('memory_id', memoryId)
      .eq('asset_id', assetData.asset_id)
      .single();

    if (existingAttachment) {
      return jsonWithCors(request, { error: 'Asset already attached to this memory' }, 409);
    }

    // If order_index is provided, check for conflicts and adjust
    let finalOrderIndex = assetData.order_index;
    if (finalOrderIndex !== undefined) {
      const { data: conflictCheck } = await client
        .from('memory_assets')
        .select('order_index')
        .eq('memory_id', memoryId)
        .eq('order_index', finalOrderIndex)
        .single();

      if (conflictCheck) {
        // Find next available index
        const { data: maxOrder } = await client
          .from('memory_assets')
          .select('order_index')
          .eq('memory_id', memoryId)
          .order('order_index', { ascending: false })
          .limit(1)
          .single();

        finalOrderIndex = (maxOrder?.order_index || 0) + 1;
      }
    } else {
      // Auto-assign next available index
      const { data: maxOrder } = await client
        .from('memory_assets')
        .select('order_index')
        .eq('memory_id', memoryId)
        .order('order_index', { ascending: false })
        .limit(1)
        .single();

      finalOrderIndex = (maxOrder?.order_index || -1) + 1;
    }

    // Create attachment
    const insertPayload = {
      memory_id: memoryId,
      asset_id: assetData.asset_id,
      order_index: finalOrderIndex,
      caption: assetData.caption,
      created_at: now
    };

    console.log('Creating asset attachment with payload:', JSON.stringify(insertPayload, null, 2));

    const { data, error } = await client
      .from('memory_assets')
      .insert(insertPayload)
      .select(`
        *,
        asset:assets (
          id,
          url,
          mime_type,
          kind,
          duration_seconds,
          file_size_bytes,
          hash_sha256,
          created_at
        )
      `)
      .single();

    if (error) {
      console.error('Database error:', error);
      return jsonWithCors(request, { error: 'Failed to attach asset' }, 500);
    }

    console.log('Returning attached asset:', JSON.stringify(data, null, 2));
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