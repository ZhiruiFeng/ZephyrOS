import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createConversationService } from '@/services';
import {
  ConversationQuerySchema,
  CreateConversationSchema,
  DeleteConversationSchema
} from '@/validation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/conversations - Get user's conversation history
 */
async function handleGetConversations(request: EnhancedRequest): Promise<NextResponse> {
  const query = request.validatedQuery!;
  const userId = request.userId!;

  const conversationService = createConversationService({ userId });
  const result = await conversationService.getConversations(query);

  if (result.error) {
    throw result.error;
  }

  return NextResponse.json({
    success: true,
    conversations: result.data || [],
    count: result.data?.length || 0
  });
}

/**
 * POST /api/conversations - Create a new conversation
 */
async function handleCreateConversation(request: EnhancedRequest): Promise<NextResponse> {
  const data = request.validatedBody!;
  const userId = request.userId!;

  const conversationService = createConversationService({ userId });
  const result = await conversationService.createConversation(data);

  if (result.error) {
    throw result.error;
  }

  return NextResponse.json(
    {
      success: true,
      conversation: result.data
    },
    { status: 201 }
  );
}

/**
 * DELETE /api/conversations - Delete a conversation
 */
async function handleDeleteConversation(request: EnhancedRequest): Promise<NextResponse> {
  const data = request.validatedBody!;
  const userId = request.userId!;

  // Extract sessionId from body
  const sessionId = data.sessionId;
  if (!sessionId) {
    const error = new Error('sessionId is required');
    (error as any).code = '400';
    throw error;
  }

  const conversationService = createConversationService({ userId });
  const result = await conversationService.deleteConversation(sessionId);

  if (result.error) {
    throw result.error;
  }

  return NextResponse.json({
    success: true,
    message: 'Conversation deleted successfully'
  });
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetConversations, {
  validation: { querySchema: ConversationQuerySchema },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 300 // GET requests - higher limit for listing
  }
});

export const POST = withStandardMiddleware(handleCreateConversation, {
  validation: { bodySchema: CreateConversationSchema },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100 // POST requests - moderate limit
  }
});

export const DELETE = withStandardMiddleware(handleDeleteConversation, {
  validation: { bodySchema: DeleteConversationSchema },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 50 // DELETE requests - lower limit
  }
});

// Explicit OPTIONS handler for CORS preflight
export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
