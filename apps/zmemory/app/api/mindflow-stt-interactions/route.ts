import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createMindflowSTTInteractionService } from '@/services';
import {
  CreateMindflowSTTInteractionSchema,
  MindflowSTTInteractionQuerySchema
} from '@/validation';

/**
 * GET /api/mindflow-stt-interactions - Get all MindFlow STT interactions for the authenticated user
 */
async function handleGetInteractions(request: EnhancedRequest): Promise<NextResponse> {
  const userId = request.userId!; // Already authenticated by middleware
  const filters = request.validatedQuery; // Already validated by middleware

  const mindflowSTTInteractionService = createMindflowSTTInteractionService({ userId });
  const result = await mindflowSTTInteractionService.getInteractions(filters);

  if (result.error) {
    throw result.error; // Middleware will handle error formatting
  }

  return NextResponse.json({ interactions: result.data || [] });
}

/**
 * POST /api/mindflow-stt-interactions - Create a new MindFlow STT interaction
 */
async function handleCreateInteraction(request: EnhancedRequest): Promise<NextResponse> {
  const userId = request.userId!; // Already authenticated by middleware
  const data = request.validatedBody; // Already validated by middleware

  const mindflowSTTInteractionService = createMindflowSTTInteractionService({ userId });
  const result = await mindflowSTTInteractionService.createInteraction(data);

  if (result.error) {
    throw result.error; // Middleware will handle error formatting
  }

  return NextResponse.json({ interaction: result.data }, { status: 201 });
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetInteractions, {
  validation: { querySchema: MindflowSTTInteractionQuerySchema },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 300 } // 300 requests per 15 minutes
});

export const POST = withStandardMiddleware(handleCreateInteraction, {
  validation: { bodySchema: CreateMindflowSTTInteractionSchema },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 100 } // 100 creates per 15 minutes
});

// Explicit OPTIONS handler for preflight requests
export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
