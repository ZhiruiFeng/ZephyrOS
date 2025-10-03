import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createConversationService } from '@/services';
import {
  UpdateConversationSchema,
  DeleteConversationSchema
} from '@/validation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/conversations/[sessionId] - Get specific conversation with messages
 */
async function handleGetConversation(
  request: EnhancedRequest,
  { params }: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse> {
  const { sessionId } = await params;
  const userId = request.userId!;

  if (!sessionId) {
    const error = new Error('sessionId is required');
    (error as any).code = '400';
    throw error;
  }

  const conversationService = createConversationService({ userId });
  const result = await conversationService.getConversation(sessionId);

  if (result.error) {
    throw result.error;
  }

  return NextResponse.json({
    success: true,
    conversation: result.data
  });
}

/**
 * PATCH /api/conversations/[sessionId] - Update conversation metadata
 */
async function handleUpdateConversation(
  request: EnhancedRequest,
  { params }: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse> {
  const { sessionId } = await params;
  const updates = request.validatedBody!;
  const userId = request.userId!;

  if (!sessionId) {
    const error = new Error('sessionId is required');
    (error as any).code = '400';
    throw error;
  }

  const conversationService = createConversationService({ userId });
  const result = await conversationService.updateConversation(sessionId, updates);

  if (result.error) {
    throw result.error;
  }

  return NextResponse.json({
    success: true,
    conversation: result.data
  });
}

/**
 * DELETE /api/conversations/[sessionId] - Delete specific conversation
 */
async function handleDeleteConversation(
  request: EnhancedRequest,
  { params }: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse> {
  const { sessionId } = await params;
  const userId = request.userId!;

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
export const GET = withStandardMiddleware(handleGetConversation, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 300 // High limit for individual conversation views
  }
});

export const PATCH = withStandardMiddleware(handleUpdateConversation, {
  validation: { bodySchema: UpdateConversationSchema },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100 // Moderate limit for updates
  }
});

export const DELETE = withStandardMiddleware(handleDeleteConversation, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 50 // Lower limit for deletions
  }
});

// Explicit OPTIONS handler for CORS preflight
export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
