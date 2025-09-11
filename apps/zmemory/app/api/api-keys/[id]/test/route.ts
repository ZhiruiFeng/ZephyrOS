import { NextRequest } from 'next/server';
import { getUser } from '../../../../../lib/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage } from '../../../../../lib/security';
import { apiKeyService } from '../../../../../lib/api-key-service';

/**
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
 *                   example: true
 *                 test_success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "API key is valid"
 *                 error:
 *                   type: string
 *                   example: "OpenAI API returned 401"
 *                   nullable: true
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: API key not found
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser(request);
    if (!user) {
      return jsonWithCors(request, { error: 'Unauthorized', success: false }, 401);
    }

    const { id } = await params;
    const testResult = await apiKeyService.testApiKey(user.id, id);

    if (testResult.success) {
      return jsonWithCors(request, {
        success: true,
        test_success: true,
        message: 'API key is valid'
      });
    } else {
      return jsonWithCors(request, {
        success: true,
        test_success: false,
        message: 'API key test failed',
        error: testResult.error
      });
    }
  } catch (error) {
    console.error('Error testing API key:', error);
    
    const message = error instanceof Error ? error.message : 'Failed to test API key';
    const status = message.includes('not found') ? 404 : 500;

    return jsonWithCors(request, {
      error: sanitizeErrorMessage(error, 'Failed to test API key'),
      success: false
    }, status);
  }
}