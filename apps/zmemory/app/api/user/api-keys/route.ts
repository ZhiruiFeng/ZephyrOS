import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabase as serviceClient } from '@/lib/supabase';
import { getAuthContext } from '@/auth';
import { generateSecureToken, hashApiKey } from '@/lib/crypto-utils';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/user/api-keys:
 *   get:
 *     tags: [User API Keys]
 *     summary: Get user's ZMemory API keys
 *     description: Retrieve all ZMemory API keys for the authenticated user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's ZMemory API keys
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ZMemoryApiKey'
 *                 success:
 *                   type: boolean
 *                   example: true
 *   post:
 *     tags: [User API Keys]
 *     summary: Generate a new ZMemory API key
 *     description: Create a new long-lived API key for ZMemory/MCP access
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateZMemoryApiKeyRequest'
 *     responses:
 *       201:
 *         description: API key generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/ZMemoryApiKeyWithToken'
 *                 success:
 *                   type: boolean
 *                   example: true
 *
 * components:
 *   schemas:
 *     ZMemoryApiKey:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         key_preview:
 *           type: string
 *           example: "zm_***abc123"
 *         scopes:
 *           type: array
 *           items:
 *             type: string
 *         is_active:
 *           type: boolean
 *         last_used_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         expires_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *
 *     ZMemoryApiKeyWithToken:
 *       allOf:
 *         - $ref: '#/components/schemas/ZMemoryApiKey'
 *         - type: object
 *           properties:
 *             api_key:
 *               type: string
 *               description: "The actual API key (only shown once)"
 *               example: "zm_1234567890abcdef1234567890abcdef"
 *
 *     CreateZMemoryApiKeyRequest:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           example: "Claude MCP Key"
 *         scopes:
 *           type: array
 *           items:
 *             type: string
 *           example: ["tasks.read", "tasks.write", "memories.read", "memories.write"]
 *         expires_in_days:
 *           type: number
 *           example: 365
 *           nullable: true
 */

const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  scopes: z.array(z.string()).optional().default(['tasks.read', 'tasks.write', 'memories.read', 'memories.write']),
  expires_in_days: z.number().min(1).max(3650).optional() // Max 10 years
});

/**
 * GET /api/user/api-keys - List user's ZMemory API keys
 *
 * OAuth-only endpoint for listing user's own API keys.
 */
async function handleListUserApiKeys(
  request: EnhancedRequest
): Promise<NextResponse> {
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

  // Get user's ZMemory API keys from a dedicated table
  const { data, error } = await serviceClient
    .from('zmemory_api_keys')
    .select('id, name, key_preview, scopes, is_active, last_used_at, expires_at, created_at')
    .eq('user_id', auth.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({
      error: `Failed to fetch API keys: ${error.message}`,
      success: false
    }, { status: 500 });
  }

  return NextResponse.json({
    data: data || [],
    success: true
  });
}

/**
 * POST /api/user/api-keys - Create a new ZMemory API key
 *
 * OAuth-only endpoint for creating user's own API keys.
 */
async function handleCreateUserApiKey(
  request: EnhancedRequest
): Promise<NextResponse> {
  // Special auth check: OAuth only
  const auth = await getAuthContext(request);
  if (!auth || auth.authType !== 'oauth') {
    return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
  }

  const body = await request.json();

  // Validate request body
  const validation = createApiKeySchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({
      error: 'Invalid request data',
      details: validation.error.errors,
      success: false
    }, { status: 400 });
  }

  const { name, scopes, expires_in_days } = validation.data;

  if (!serviceClient) {
    return NextResponse.json({
      error: 'Database not configured',
      success: false
    }, { status: 500 });
  }

  // Generate a secure API key
  const apiKey = `zm_${generateSecureToken(32)}`;
  const keyPreview = `zm_***${apiKey.slice(-6)}`;

  // Calculate expiration date
  let expiresAt = null;
  if (expires_in_days) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expires_in_days);
  }

  // Insert the new API key
  const { data, error } = await serviceClient
    .from('zmemory_api_keys')
    .insert({
      user_id: auth.id,
      name,
      api_key_hash: await hashApiKey(apiKey), // Store hashed version
      key_preview: keyPreview,
      scopes,
      expires_at: expiresAt?.toISOString()
    })
    .select('id, name, key_preview, scopes, is_active, last_used_at, expires_at, created_at')
    .single();

  if (error) {
    if (error.code === '23505') { // Unique constraint violation
      return NextResponse.json({
        error: 'API key with this name already exists',
        success: false
      }, { status: 409 });
    }
    return NextResponse.json({
      error: `Failed to create API key: ${error.message}`,
      success: false
    }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      ...data,
      api_key: apiKey // Return the actual key only once
    },
    success: true
  }, { status: 201 });
}

// Apply middleware with auth disabled (handled manually for OAuth-specific logic)
export const GET = withStandardMiddleware(handleListUserApiKeys, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
  },
  auth: false // Handled manually in handler for OAuth-specific logic
});

export const POST = withStandardMiddleware(handleCreateUserApiKey, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 20
  },
  auth: false // Handled manually in handler for OAuth-specific logic
});

// Explicit OPTIONS handler for CORS preflight
export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
