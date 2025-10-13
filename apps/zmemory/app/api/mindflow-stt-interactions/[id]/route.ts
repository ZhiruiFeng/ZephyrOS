import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createMindflowSTTInteractionService } from '@/services';
import { UpdateMindflowSTTInteractionSchema } from '@/validation';

/**
 * GET /api/mindflow-stt-interactions/[id] - Get a single MindFlow STT interaction
 */
async function handleGetInteraction(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const userId = request.userId!; // Already authenticated by middleware

  const mindflowSTTInteractionService = createMindflowSTTInteractionService({ userId });
  const result = await mindflowSTTInteractionService.getInteraction(id);

  if (result.error) {
    throw result.error; // Middleware will handle error formatting
  }

  return NextResponse.json({ interaction: result.data });
}

/**
 * PUT /api/mindflow-stt-interactions/[id] - Update a MindFlow STT interaction
 */
async function handleUpdateInteraction(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const userId = request.userId!; // Already authenticated by middleware
  const data = request.validatedBody; // Already validated by middleware

  const mindflowSTTInteractionService = createMindflowSTTInteractionService({ userId });
  const result = await mindflowSTTInteractionService.updateInteraction(id, data);

  if (result.error) {
    throw result.error; // Middleware will handle error formatting
  }

  return NextResponse.json({ interaction: result.data });
}

/**
 * DELETE /api/mindflow-stt-interactions/[id] - Delete a MindFlow STT interaction
 */
async function handleDeleteInteraction(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const userId = request.userId!; // Already authenticated by middleware

  const mindflowSTTInteractionService = createMindflowSTTInteractionService({ userId });
  const result = await mindflowSTTInteractionService.deleteInteraction(id);

  if (result.error) {
    throw result.error; // Middleware will handle error formatting
  }

  return NextResponse.json({ message: 'MindFlow STT interaction deleted successfully' });
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetInteraction, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 300 } // 300 requests per 15 minutes
});

export const PUT = withStandardMiddleware(handleUpdateInteraction, {
  validation: { bodySchema: UpdateMindflowSTTInteractionSchema },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 100 } // 100 updates per 15 minutes
});

export const DELETE = withStandardMiddleware(handleDeleteInteraction, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 50 } // 50 deletes per 15 minutes
});

// Explicit OPTIONS handler for preflight requests
export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
