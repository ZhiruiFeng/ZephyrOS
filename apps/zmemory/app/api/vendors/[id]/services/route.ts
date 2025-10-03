import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { apiKeyService } from '@/lib/api-key-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/vendors/[id]/services - Get services for a vendor
 *
 * Retrieve all active services for a specific vendor
 *
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
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function handleGetVendorServices(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  const services = await apiKeyService.getVendorServices(id);

  return NextResponse.json({
    data: services,
    success: true
  });
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetVendorServices, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 300 // High limit for lookup operations
  }
});

// Explicit OPTIONS handler for CORS preflight
export const OPTIONS = withStandardMiddleware(async () => {
  return new NextResponse(null, { status: 200 });
}, {
  auth: false // OPTIONS requests don't need authentication
});
