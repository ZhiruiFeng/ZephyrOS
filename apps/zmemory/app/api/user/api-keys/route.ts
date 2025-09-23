import { NextRequest } from 'next/server'
import { getAuthContext } from '../../../../lib/auth'
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage } from '../../../../lib/security'
import { createClient } from '@supabase/supabase-js'
import { generateSecureToken, hashApiKey } from '../../../../lib/crypto-utils'
import { z } from 'zod'

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    // Only allow OAuth-authenticated users to list keys
    if (!auth || auth.authType !== 'oauth') {
      return jsonWithCors(request, { error: 'Unauthorized', success: false }, 401);
    }

    // Get user's ZMemory API keys from a dedicated table
    const { data, error } = await supabase
      .from('zmemory_api_keys')
      .select('id, name, key_preview, scopes, is_active, last_used_at, expires_at, created_at')
      .eq('user_id', auth.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch API keys: ${error.message}`);
    }

    return jsonWithCors(request, {
      data: data || [],
      success: true
    });
  } catch (error) {
    console.error('Error fetching ZMemory API keys:', error);
    return jsonWithCors(request, {
      error: sanitizeErrorMessage(error, 'Failed to fetch API keys'),
      success: false
    }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    // Only allow OAuth-authenticated users to create keys
    if (!auth || auth.authType !== 'oauth') {
      return jsonWithCors(request, { error: 'Unauthorized', success: false }, 401);
    }

    const body = await request.json();

    // Validate request body
    const validation = createApiKeySchema.safeParse(body);
    if (!validation.success) {
      return jsonWithCors(request, {
        error: 'Invalid request data',
        details: validation.error.errors,
        success: false
      }, 400);
    }

    const { name, scopes, expires_in_days } = validation.data;

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
    const { data, error } = await supabase
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
        throw new Error('API key with this name already exists');
      }
      throw new Error(`Failed to create API key: ${error.message}`);
    }

    return jsonWithCors(request, {
      data: {
        ...data,
        api_key: apiKey // Return the actual key only once
      },
      success: true
    }, 201);
  } catch (error) {
    console.error('Error creating ZMemory API key:', error);

    const message = error instanceof Error ? error.message : 'Failed to create API key';
    const status = message.includes('already exists') ? 409 :
                  message.includes('not found') || message.includes('Invalid') ? 400 : 500;

    return jsonWithCors(request, {
      error: sanitizeErrorMessage(error, 'Failed to create API key'),
      success: false
    }, status);
  }
}

