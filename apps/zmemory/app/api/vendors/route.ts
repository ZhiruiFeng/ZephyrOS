import { NextRequest } from 'next/server';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage } from '../../../lib/security';
import { apiKeyService } from '../../../lib/api-key-service';

/**
 * @swagger
 * /api/vendors:
 *   get:
 *     tags: [Vendors]
 *     summary: Get all active vendors
 *     description: Retrieve list of all active AI/API vendors supported by the platform
 *     responses:
 *       200:
 *         description: List of active vendors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Vendor'
 *                 success:
 *                   type: boolean
 *                   example: true
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 * 
 * components:
 *   schemas:
 *     Vendor:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "openai"
 *         name:
 *           type: string
 *           example: "OpenAI"
 *         description:
 *           type: string
 *           example: "GPT models, DALL-E, Whisper"
 *         auth_type:
 *           type: string
 *           enum: [api_key, oauth, bearer_token]
 *           example: "api_key"
 *         base_url:
 *           type: string
 *           nullable: true
 *           example: "https://api.openai.com/v1"
 *         is_active:
 *           type: boolean
 *           example: true
 */

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}

export async function GET(request: NextRequest) {
  try {
    const vendors = await apiKeyService.getVendors();

    return jsonWithCors(request, { 
      data: vendors, 
      success: true 
    });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return jsonWithCors(request, {
      error: sanitizeErrorMessage(error, 'Failed to fetch vendors'),
      success: false
    }, 500);
  }
}