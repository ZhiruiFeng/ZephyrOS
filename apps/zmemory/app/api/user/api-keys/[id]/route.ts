import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabase as serviceClient } from '@/lib/supabase';
import { getAuthContext } from '@/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  is_active: z.boolean().optional(),
  scopes: z.array(z.string()).optional()
});

/**
 * PUT /api/user/api-keys/[id] - Update a user API key
 *
 * OAuth-only endpoint for managing user's own API keys.
 */
async function handleUpdateUserApiKey(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  // Special auth check: OAuth only
  const auth = await getAuthContext(request);
  if (!auth || auth.authType !== 'oauth') {
    return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
  }

  const body = await request.json();
  const validation = updateApiKeySchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'Invalid request data',
      details: validation.error.errors,
      success: false
    }, { status: 400 });
  }

  const updates = validation.data;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({
      error: 'No updates provided',
      success: false
    }, { status: 400 });
  }

  if (!serviceClient) {
    return NextResponse.json({
      error: 'Database not configured',
      success: false
    }, { status: 500 });
  }

  const { data, error } = await serviceClient
    .from('zmemory_api_keys')
    .update(updates)
    .eq('id', id)
    .eq('user_id', auth.id)
    .select('id, name, key_preview, scopes, is_active, last_used_at, expires_at, created_at')
    .single();

  if (error) {
    return NextResponse.json({
      error: `Failed to update API key: ${error.message}`,
      success: false
    }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({
      error: 'API key not found',
      success: false
    }, { status: 404 });
  }

  return NextResponse.json({
    data,
    success: true
  });
}

/**
 * DELETE /api/user/api-keys/[id] - Delete a user API key
 *
 * OAuth-only endpoint for deleting user's own API keys.
 */
async function handleDeleteUserApiKey(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  // Special auth check: OAuth only
  const auth = await getAuthContext(request);
  if (!auth || auth.authType !== 'oauth') {
    return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
  }

  if (!serviceClient) {
    return NextResponse.json({
      error: 'Database not configured',
      success: false
    }, { status: 500 });
  }

  const { error } = await serviceClient
    .from('zmemory_api_keys')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.id);

  if (error) {
    return NextResponse.json({
      error: `Failed to delete API key: ${error.message}`,
      success: false
    }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: 'API key deleted successfully'
  });
}

// Apply middleware (auth check happens inside handlers for OAuth-only requirement)
export const PUT = withStandardMiddleware(handleUpdateUserApiKey, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 50
  },
  auth: false // Handled manually in handler for OAuth-specific logic
});

export const DELETE = withStandardMiddleware(handleDeleteUserApiKey, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 20
  },
  auth: false // Handled manually in handler for OAuth-specific logic
});

// Explicit OPTIONS handler for CORS preflight
export const OPTIONS = withStandardMiddleware(async () => {
  return new NextResponse(null, { status: 200 });
}, {
  auth: false
});
