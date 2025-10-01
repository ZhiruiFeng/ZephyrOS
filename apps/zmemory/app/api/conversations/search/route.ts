import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createConversationService } from '@/services';
import { MessageSearchSchema } from '@/validation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/conversations/search - Search messages across user's conversation history
 */
async function handleSearchMessages(request: EnhancedRequest): Promise<NextResponse> {
  const query = request.validatedQuery!;
  const userId = request.userId!;

  const conversationService = createConversationService({ userId });
  const result = await conversationService.searchMessages(query.q, query.limit);

  if (result.error) {
    throw result.error;
  }

  return NextResponse.json({
    success: true,
    query: query.q,
    results: result.data || [],
    count: result.data?.length || 0
  });
}

// Apply middleware with search-specific rate limiting
export const GET = withStandardMiddleware(handleSearchMessages, {
  validation: { querySchema: MessageSearchSchema },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100 // Search operations are more expensive
  }
});

// Explicit OPTIONS handler for CORS preflight
export const OPTIONS = withStandardMiddleware(async () => {
  return new NextResponse(null, { status: 200 });
}, {
  auth: false // OPTIONS requests don't need authentication
});
