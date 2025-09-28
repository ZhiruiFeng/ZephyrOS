import { NextRequest } from 'next/server';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage } from '@/lib/security';
import { apiKeyService } from '@/lib/api-key-service';

/**
 * @swagger
 * /api/vendors/{id}/services:
 *   get:
 *     tags: [Vendors]
 *     summary: Get services for a vendor
 *     description: Retrieve all active services for a specific vendor
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *         example: "openai"
 *     responses:
 *       200:
 *         description: List of vendor services
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/VendorService'
 *                 success:
 *                   type: boolean
 *                   example: true
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 * 
 * components:
 *   schemas:
 *     VendorService:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "openai_gpt4"
 *         vendor_id:
 *           type: string
 *           example: "openai"
 *         service_name:
 *           type: string
 *           example: "gpt-4"
 *         display_name:
 *           type: string
 *           example: "GPT-4"
 *         description:
 *           type: string
 *           nullable: true
 *           example: "Latest GPT-4 model"
 *         is_active:
 *           type: boolean
 *           example: true
 */

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const services = await apiKeyService.getVendorServices(id);

    return jsonWithCors(request, { 
      data: services, 
      success: true 
    });
  } catch (error) {
    console.error('Error fetching vendor services:', error);
    return jsonWithCors(request, {
      error: sanitizeErrorMessage(error, 'Failed to fetch vendor services'),
      success: false
    }, 500);
  }
}