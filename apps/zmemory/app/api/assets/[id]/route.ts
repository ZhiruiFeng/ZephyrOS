import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabaseServer } from '@/lib/config/supabase-server';
import {
  AssetUpdateSchema,
  type AssetUpdateBody
} from '@/validation';

export const dynamic = 'force-dynamic';

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
async function handleGet(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const userId = request.userId!;

  if (!supabaseServer) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await supabaseServer
    .from('assets')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to fetch asset' }, { status: 500 });
  }

  return NextResponse.json(data);
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
async function handlePut(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const userId = request.userId!;
  const assetData = request.validatedBody!;

  if (!supabaseServer) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await supabaseServer
    .from('assets')
    .update(assetData)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 });
  }

  return NextResponse.json(data);
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
async function handleDelete(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const userId = request.userId!;

  if (!supabaseServer) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // Check if asset exists and belongs to user
  const { data: assetCheck, error: checkError } = await supabaseServer
    .from('assets')
    .select('id')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (checkError || !assetCheck) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  // Delete the asset (this will cascade delete memory_assets due to foreign key)
  const { error } = await supabaseServer
    .from('assets')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Asset deleted successfully' });
}

export const GET = withStandardMiddleware(handleGet, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 300
  }
});

export const PUT = withStandardMiddleware(handlePut, {
  validation: { bodySchema: AssetUpdateSchema },
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