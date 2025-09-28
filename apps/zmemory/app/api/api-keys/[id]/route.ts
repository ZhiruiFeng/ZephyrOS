import { NextRequest } from 'next/server';
import { getUser } from '@/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage } from '@/lib/security';
import { apiKeyService } from '@/lib/api-key-service';
import { z } from 'zod';

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

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser(request);
    if (!user) {
      return jsonWithCors(request, { error: 'Unauthorized', success: false }, 401);
    }

    const { id } = await params;
    const apiKeys = await apiKeyService.getUserApiKeys(user.id);
    const apiKey = apiKeys.find(key => key.id === id);

    if (!apiKey) {
      return jsonWithCors(request, { 
        error: 'API key not found', 
        success: false 
      }, 404);
    }

    return jsonWithCors(request, { 
      data: apiKey, 
      success: true 
    });
  } catch (error) {
    console.error('Error fetching API key:', error);
    return jsonWithCors(request, {
      error: sanitizeErrorMessage(error, 'Failed to fetch API key'),
      success: false
    }, 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser(request);
    if (!user) {
      return jsonWithCors(request, { error: 'Unauthorized', success: false }, 401);
    }

    const { id } = await params;
    const body = await request.json();
    
    // Validate request body
    const validation = updateApiKeySchema.safeParse(body);
    if (!validation.success) {
      return jsonWithCors(request, {
        error: 'Invalid request data',
        details: validation.error.errors,
        success: false
      }, 400);
    }

    const apiKey = await apiKeyService.updateApiKey(user.id, id, validation.data);

    return jsonWithCors(request, { 
      data: apiKey, 
      success: true 
    });
  } catch (error) {
    console.error('Error updating API key:', error);
    
    const message = error instanceof Error ? error.message : 'Failed to update API key';
    const status = message.includes('not found') ? 404 : 
                  message.includes('Invalid') ? 400 : 500;

    return jsonWithCors(request, {
      error: sanitizeErrorMessage(error, 'Failed to update API key'),
      success: false
    }, status);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser(request);
    if (!user) {
      return jsonWithCors(request, { error: 'Unauthorized', success: false }, 401);
    }

    const { id } = await params;
    await apiKeyService.deleteApiKey(user.id, id);

    return jsonWithCors(request, { 
      success: true,
      message: 'API key deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting API key:', error);
    
    const message = error instanceof Error ? error.message : 'Failed to delete API key';
    const status = message.includes('not found') ? 404 : 500;

    return jsonWithCors(request, {
      error: sanitizeErrorMessage(error, 'Failed to delete API key'),
      success: false
    }, status);
  }
}