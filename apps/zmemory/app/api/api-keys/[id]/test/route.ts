import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { apiKeyService } from '@/lib/services/api-key-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/api-keys/[id]/test - Test an API key
 *
 * Test if an API key is valid by making a request to the vendor's API
 *
 * @swagger
 * /api/api-keys/{id}/test:
 *   post:
 *     tags: [API Keys]
 *     summary: Test an API key
 *     description: Test if an API key is valid by making a request to the vendor's API
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
 *         description: Test completed (check success field for result)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 test_success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 *                   nullable: true
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: API key not found
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function handleTestApiKey(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const userId = request.userId!;

  const testResult = await apiKeyService.testApiKey(userId, id);

  if (testResult.success) {
    return NextResponse.json({
      success: true,
      test_success: true,
      message: 'API key is valid'
    });
  } else {
    return NextResponse.json({
      success: true,
      test_success: false,
      message: 'API key test failed',
      error: testResult.error
    });
  }
}

// Apply middleware
export const POST = withStandardMiddleware(handleTestApiKey, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 20 // Low limit for API testing operations
  }
});

// Explicit OPTIONS handler for CORS preflight
export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
