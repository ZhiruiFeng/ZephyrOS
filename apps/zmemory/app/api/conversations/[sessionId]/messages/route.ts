import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createConversationService } from '@/services';
import { AddMessagesSchema } from '@/validation';

export const dynamic = 'force-dynamic';

/**
 * POST /api/conversations/[sessionId]/messages - Add messages to existing conversation
 */
async function handleAddMessages(
  request: EnhancedRequest,
  { params }: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse> {
  const { sessionId } = await params;
  const { messages } = request.validatedBody!;
  const userId = request.userId!;

  if (!sessionId) {
    const error = new Error('sessionId is required');
    (error as any).code = '400';
    throw error;
  }

  const conversationService = createConversationService({ userId });
  const result = await conversationService.addMessages(sessionId, messages);

  if (result.error) {
    throw result.error;
  }

  // Fetch updated conversation
  const conversationResult = await conversationService.getConversation(sessionId);

  return NextResponse.json({
    success: true,
    messagesAdded: result.data?.added || 0,
    totalMessages: result.data?.total || 0,
    conversation: conversationResult.data || null
  });
}

// Apply middleware
export const POST = withStandardMiddleware(handleAddMessages, {
  validation: { bodySchema: AddMessagesSchema },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 200 // Moderate-high limit for message additions
  }
});

// Explicit OPTIONS handler for CORS preflight
export const OPTIONS = withStandardMiddleware(async () => {
  return new NextResponse(null, { status: 200 });
}, {
  auth: false // OPTIONS requests don't need authentication
});
