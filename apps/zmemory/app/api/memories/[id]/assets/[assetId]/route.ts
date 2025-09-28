import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClientForRequest, getUserIdFromRequest } from '@/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '@/lib/security';
import { 
  MemoryAssetUpdateSchema,
  type MemoryAssetUpdateBody
} from '@/validation';

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * @swagger
 * /api/memories/{id}/assets/{assetId}:
 *   put:
 *     summary: Update a memory asset attachment
 *     description: Update the order index or caption of an asset attachment
 *     tags: [Memory Assets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Memory ID
 *       - in: path
 *         name: assetId
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
 *               order_index:
 *                 type: integer
 *                 minimum: 0
 *               caption:
 *                 type: string
 *     responses:
 *       200:
 *         description: Asset attachment updated successfully
 *       404:
 *         description: Asset attachment not found
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  const { id: memoryId, assetId } = await params;
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 50)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const body = await request.json();
    
    console.log('=== UPDATE MEMORY ASSET API DEBUG ===');
    console.log('Memory ID:', memoryId);
    console.log('Asset ID:', assetId);
    console.log('Received body:', JSON.stringify(body, null, 2));
    
    // Validate request body
    const validationResult = MemoryAssetUpdateSchema.safeParse(body);
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
        memory_id: memoryId,
        asset_id: assetId,
        ...assetData
      };
      return jsonWithCors(request, mockUpdatedAsset);
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

    // Check if the asset attachment exists
    const { data: existingAttachment, error: attachmentError } = await client
      .from('memory_assets')
      .select('memory_id, asset_id, order_index')
      .eq('memory_id', memoryId)
      .eq('asset_id', assetId)
      .single();

    if (attachmentError || !existingAttachment) {
      return jsonWithCors(request, { error: 'Asset attachment not found' }, 404);
    }

    // If order_index is being changed, handle conflicts
    let finalOrderIndex = assetData.order_index;
    if (finalOrderIndex !== undefined && finalOrderIndex !== existingAttachment.order_index) {
      const { data: conflictCheck } = await client
        .from('memory_assets')
        .select('asset_id')
        .eq('memory_id', memoryId)
        .eq('order_index', finalOrderIndex)
        .neq('asset_id', assetId)
        .single();

      if (conflictCheck) {
        // Swap order indices
        await client
          .from('memory_assets')
          .update({ order_index: existingAttachment.order_index })
          .eq('memory_id', memoryId)
          .eq('asset_id', conflictCheck.asset_id);
      }
    }

    console.log('Updating asset attachment with payload:', JSON.stringify(assetData, null, 2));

    // Update attachment
    const { data, error } = await client
      .from('memory_assets')
      .update(assetData)
      .eq('memory_id', memoryId)
      .eq('asset_id', assetId)
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
      return jsonWithCors(request, { error: 'Failed to update asset attachment' }, 500);
    }

    console.log('Returning updated asset attachment:', JSON.stringify(data, null, 2));
    return jsonWithCors(request, data);
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

/**
 * @swagger
 * /api/memories/{id}/assets/{assetId}:
 *   delete:
 *     summary: Remove an asset from a memory
 *     description: Detach an asset from a memory (does not delete the asset itself)
 *     tags: [Memory Assets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Memory ID
 *       - in: path
 *         name: assetId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Asset detached successfully
 *       404:
 *         description: Asset attachment not found
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  const { id: memoryId, assetId } = await params;
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 30)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    // If no database configuration, return mock response
    if (!supabase) {
      return jsonWithCors(request, { message: 'Asset detached successfully (mock)' });
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

    // Get the attachment to check if it exists and get its order_index
    const { data: attachment, error: getError } = await client
      .from('memory_assets')
      .select('order_index')
      .eq('memory_id', memoryId)
      .eq('asset_id', assetId)
      .single();

    if (getError || !attachment) {
      return jsonWithCors(request, { error: 'Asset attachment not found' }, 404);
    }

    // Delete the attachment
    const { error } = await client
      .from('memory_assets')
      .delete()
      .eq('memory_id', memoryId)
      .eq('asset_id', assetId);

    if (error) {
      console.error('Database error:', error);
      return jsonWithCors(request, { error: 'Failed to detach asset' }, 500);
    }

    // Reorder remaining assets to fill gaps
    const { data: remainingAssets, error: remainingError } = await client
      .from('memory_assets')
      .select('asset_id, order_index')
      .eq('memory_id', memoryId)
      .gt('order_index', attachment.order_index)
      .order('order_index');

    if (!remainingError && remainingAssets && remainingAssets.length > 0) {
      // Update order indices to remove gap
      for (let i = 0; i < remainingAssets.length; i++) {
        const asset = remainingAssets[i];
        await client
          .from('memory_assets')
          .update({ order_index: attachment.order_index + i })
          .eq('memory_id', memoryId)
          .eq('asset_id', asset.asset_id);
      }
    }

    return jsonWithCors(request, { message: 'Asset detached successfully' });
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}