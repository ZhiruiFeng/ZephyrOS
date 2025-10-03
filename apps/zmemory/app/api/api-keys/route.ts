import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { apiKeyService } from '@/lib/api-key-service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/api-keys:
 *   get:
 *     tags: [API Keys]
 *     summary: Get user's API keys
 *     description: Retrieve all API keys for the authenticated user with vendor/service details
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's API keys
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ApiKeyWithDetails'
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *   post:
 *     tags: [API Keys]
 *     summary: Create a new API key
 *     description: Add a new encrypted API key for a vendor/service
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateApiKeyRequest'
 *     responses:
 *       201:
 *         description: API key created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/UserApiKey'
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       409:
 *         description: API key already exists for this vendor/service
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *
 * components:
 *   schemas:
 *     ApiKeyWithDetails:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         vendor_id:
 *           type: string
 *         service_id:
 *           type: string
 *           nullable: true
 *         key_preview:
 *           type: string
 *           example: "***sk-abc123"
 *         display_name:
 *           type: string
 *           nullable: true
 *         is_active:
 *           type: boolean
 *         last_used_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         vendor_name:
 *           type: string
 *         vendor_description:
 *           type: string
 *         service_name:
 *           type: string
 *           nullable: true
 *         service_display_name:
 *           type: string
 *           nullable: true
 *
 *     CreateApiKeyRequest:
 *       type: object
 *       required:
 *         - vendor_id
 *         - api_key
 *       properties:
 *         vendor_id:
 *           type: string
 *           example: "openai"
 *         service_id:
 *           type: string
 *           example: "openai_gpt4"
 *           nullable: true
 *         api_key:
 *           type: string
 *           example: "sk-1234567890abcdef"
 *         display_name:
 *           type: string
 *           example: "My OpenAI Key"
 *           nullable: true
 */

const createApiKeySchema = z.object({
  vendor_id: z.string().min(1, 'Vendor ID is required'),
  service_id: z.string().optional(),
  api_key: z.string().min(8, 'API key must be at least 8 characters'),
  display_name: z.string().optional()
});

/**
 * GET /api/api-keys - Get user's API keys
 */
async function handleGetApiKeys(
  request: EnhancedRequest
): Promise<NextResponse> {
  const userId = request.userId!;

  const apiKeys = await apiKeyService.getUserApiKeys(userId);

  return NextResponse.json({
    data: apiKeys,
    success: true
  });
}

/**
 * POST /api/api-keys - Create a new API key
 */
async function handleCreateApiKey(
  request: EnhancedRequest
): Promise<NextResponse> {
  const userId = request.userId!;
  const data = request.validatedBody!;

  const apiKey = await apiKeyService.createApiKey(userId, data);

  return NextResponse.json({
    data: apiKey,
    success: true
  }, { status: 201 });
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetApiKeys, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
  }
});

export const POST = withStandardMiddleware(handleCreateApiKey, {
  validation: {
    bodySchema: createApiKeySchema
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 20
  }
});

// Explicit OPTIONS handler for CORS preflight
export const OPTIONS = withStandardMiddleware(async () => {
  return new NextResponse(null, { status: 200 });
}, {
  auth: false
});
