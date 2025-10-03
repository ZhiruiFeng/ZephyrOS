import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabaseServer } from '@/lib/config/supabase-server';
import {
  MemoryAssetUpdateSchema,
  type MemoryAssetUpdateBody
} from '@/validation';

export const dynamic = 'force-dynamic';

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
async function handlePut(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> }
): Promise<NextResponse> {
  const { id: memoryId, assetId } = await params;
  const userId = request.userId!;
  const assetData = request.validatedBody!;

  if (!supabaseServer) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // Verify memory belongs to user
  const { data: memoryCheck, error: memoryError } = await supabaseServer
    .from('memories')
    .select('id')
    .eq('id', memoryId)
    .eq('user_id', userId)
    .single();

  if (memoryError || !memoryCheck) {
    return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
  }

  // Check if the asset attachment exists
  const { data: existingAttachment, error: attachmentError } = await supabaseServer
    .from('memory_assets')
    .select('memory_id, asset_id, order_index')
    .eq('memory_id', memoryId)
    .eq('asset_id', assetId)
    .single();

  if (attachmentError || !existingAttachment) {
    return NextResponse.json({ error: 'Asset attachment not found' }, { status: 404 });
  }

  // If order_index is being changed, handle conflicts
  let finalOrderIndex = assetData.order_index;
  if (finalOrderIndex !== undefined && finalOrderIndex !== existingAttachment.order_index) {
    const { data: conflictCheck } = await supabaseServer
      .from('memory_assets')
      .select('asset_id')
      .eq('memory_id', memoryId)
      .eq('order_index', finalOrderIndex)
      .neq('asset_id', assetId)
      .single();

    if (conflictCheck) {
      // Swap order indices
      await supabaseServer
        .from('memory_assets')
        .update({ order_index: existingAttachment.order_index })
        .eq('memory_id', memoryId)
        .eq('asset_id', conflictCheck.asset_id);
    }
  }

  // Update attachment
  const { data, error } = await supabaseServer
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
    return NextResponse.json({ error: 'Failed to update asset attachment' }, { status: 500 });
  }

  return NextResponse.json(data);
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
async function handleDelete(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> }
): Promise<NextResponse> {
  const { id: memoryId, assetId } = await params;
  const userId = request.userId!;

  if (!supabaseServer) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // Verify memory belongs to user
  const { data: memoryCheck, error: memoryError } = await supabaseServer
    .from('memories')
    .select('id')
    .eq('id', memoryId)
    .eq('user_id', userId)
    .single();

  if (memoryError || !memoryCheck) {
    return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
  }

  // Get the attachment to check if it exists and get its order_index
  const { data: attachment, error: getError } = await supabaseServer
    .from('memory_assets')
    .select('order_index')
    .eq('memory_id', memoryId)
    .eq('asset_id', assetId)
    .single();

  if (getError || !attachment) {
    return NextResponse.json({ error: 'Asset attachment not found' }, { status: 404 });
  }

  // Delete the attachment
  const { error } = await supabaseServer
    .from('memory_assets')
    .delete()
    .eq('memory_id', memoryId)
    .eq('asset_id', assetId);

  if (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to detach asset' }, { status: 500 });
  }

  // Reorder remaining assets to fill gaps
  const { data: remainingAssets, error: remainingError } = await supabaseServer
    .from('memory_assets')
    .select('asset_id, order_index')
    .eq('memory_id', memoryId)
    .gt('order_index', attachment.order_index)
    .order('order_index');

  if (!remainingError && remainingAssets && remainingAssets.length > 0) {
    // Update order indices to remove gap
    for (let i = 0; i < remainingAssets.length; i++) {
      const asset = remainingAssets[i];
      await supabaseServer
        .from('memory_assets')
        .update({ order_index: attachment.order_index + i })
        .eq('memory_id', memoryId)
        .eq('asset_id', asset.asset_id);
    }
  }

  return NextResponse.json({ message: 'Asset detached successfully' });
}

export const PUT = withStandardMiddleware(handlePut, {
  validation: { bodySchema: MemoryAssetUpdateSchema },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 50
  }
});

export const DELETE = withStandardMiddleware(handleDelete, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 30
  }
});

export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';