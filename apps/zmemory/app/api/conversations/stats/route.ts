import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createConversationService } from '@/services';

export const dynamic = 'force-dynamic';

/**
 * GET /api/conversations/stats - Get user's conversation statistics
 */
async function handleGetStats(request: EnhancedRequest): Promise<NextResponse> {
  const userId = request.userId!;

  const conversationService = createConversationService({ userId });
  const result = await conversationService.getStats();

  if (result.error) {
    throw result.error;
  }

  return NextResponse.json({
    success: true,
    stats: result.data
  });
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetStats, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100 // Statistics are relatively lightweight
  }
});

// Explicit OPTIONS handler for CORS preflight
export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
