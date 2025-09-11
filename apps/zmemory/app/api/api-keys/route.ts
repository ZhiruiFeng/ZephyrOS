import { NextRequest } from 'next/server';
import { getUser } from '../../../lib/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage } from '../../../lib/security';
import { apiKeyService } from '../../../lib/api-key-service';
import { z } from 'zod';

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

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return jsonWithCors(request, { error: 'Unauthorized', success: false }, 401);
    }

    const apiKeys = await apiKeyService.getUserApiKeys(user.id);

    return jsonWithCors(request, { 
      data: apiKeys, 
      success: true 
    });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return jsonWithCors(request, {
      error: sanitizeErrorMessage(error, 'Failed to fetch API keys'),
      success: false
    }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
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

    const apiKey = await apiKeyService.createApiKey(user.id, validation.data);

    return jsonWithCors(request, { 
      data: apiKey, 
      success: true 
    }, 201);
  } catch (error) {
    console.error('Error creating API key:', error);
    
    const message = error instanceof Error ? error.message : 'Failed to create API key';
    const status = message.includes('already exists') ? 409 : 
                  message.includes('not found') || message.includes('Invalid') ? 400 : 500;

    return jsonWithCors(request, {
      error: sanitizeErrorMessage(error, 'Failed to create API key'),
      success: false
    }, status);
  }
}