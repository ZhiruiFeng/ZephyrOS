import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { apiKeyService } from '@/lib/api-key-service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/api-keys/{id}:
 *   get:
 *     tags: [API Keys]
 *     summary: Get a specific API key
 *     description: Retrieve details of a specific API key (without the actual key value)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: API key ID
 *     responses:
 *       200:
 *         description: API key details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/ApiKeyWithDetails'
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: API key not found
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *   put:
 *     tags: [API Keys]
 *     summary: Update an API key
 *     description: Update an existing API key's details or the key itself
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: API key ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateApiKeyRequest'
 *     responses:
 *       200:
 *         description: API key updated successfully
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
 *       404:
 *         description: API key not found
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *   delete:
 *     tags: [API Keys]
 *     summary: Delete an API key
 *     description: Permanently delete an API key
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: API key ID
 *     responses:
 *       200:
 *         description: API key deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "API key deleted successfully"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: API key not found
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *
 * components:
 *   schemas:
 *     UpdateApiKeyRequest:
 *       type: object
 *       properties:
 *         api_key:
 *           type: string
 *           example: "sk-new1234567890abcdef"
 *           nullable: true
 *         display_name:
 *           type: string
 *           example: "Updated OpenAI Key"
 *           nullable: true
 *         is_active:
 *           type: boolean
 *           example: true
 *           nullable: true
 */

const updateApiKeySchema = z.object({
  api_key: z.string().min(8, 'API key must be at least 8 characters').optional(),
  display_name: z.string().optional(),
  is_active: z.boolean().optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

/**
 * GET /api/api-keys/[id] - Get a specific API key
 */
async function handleGetApiKey(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const userId = request.userId!;

  const apiKeys = await apiKeyService.getUserApiKeys(userId);
  const apiKey = apiKeys.find(key => key.id === id);

  if (!apiKey) {
    return NextResponse.json({
      error: 'API key not found',
      success: false
    }, { status: 404 });
  }

  return NextResponse.json({
    data: apiKey,
    success: true
  });
}

/**
 * PUT /api/api-keys/[id] - Update an API key
 */
async function handleUpdateApiKey(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const userId = request.userId!;
  const data = request.validatedBody!;

  const apiKey = await apiKeyService.updateApiKey(userId, id, data);

  return NextResponse.json({
    data: apiKey,
    success: true
  });
}

/**
 * DELETE /api/api-keys/[id] - Delete an API key
 */
async function handleDeleteApiKey(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const userId = request.userId!;

  await apiKeyService.deleteApiKey(userId, id);

  return NextResponse.json({
    success: true,
    message: 'API key deleted successfully'
  });
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetApiKey, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
  }
});

export const PUT = withStandardMiddleware(handleUpdateApiKey, {
  validation: {
    bodySchema: updateApiKeySchema
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 50
  }
});

export const DELETE = withStandardMiddleware(handleDeleteApiKey, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 20
  }
});

// Explicit OPTIONS handler for CORS preflight
export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
