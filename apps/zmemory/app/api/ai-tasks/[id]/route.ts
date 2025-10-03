import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createAITaskService } from '@/services';
import { AITaskUpdateSchema } from '@/validation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ai-tasks/[id] - Get a specific AI task
 */
async function handleGetAITask(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const userId = request.userId!;

  const aiTaskService = createAITaskService({ userId });
  const result = await aiTaskService.findAITaskById(id);

  if (result.error) {
    if (result.error.message === 'AI task not found') {
      return NextResponse.json({ error: 'AI task not found' }, { status: 404 });
    }
    throw result.error;
  }

  return NextResponse.json({
    ai_task: result.data
  });
}

/**
 * PUT /api/ai-tasks/[id] - Update an AI task
 */
async function handleUpdateAITask(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const updates = request.validatedBody!;
  const userId = request.userId!;

  const aiTaskService = createAITaskService({ userId });
  const result = await aiTaskService.updateAITask(id, updates);

  if (result.error) {
    if (result.error.message === 'AI task not found') {
      return NextResponse.json({ error: 'AI task not found' }, { status: 404 });
    }
    throw result.error;
  }

  return NextResponse.json({
    ai_task: result.data
  });
}

/**
 * DELETE /api/ai-tasks/[id] - Delete an AI task
 */
async function handleDeleteAITask(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const userId = request.userId!;

  const aiTaskService = createAITaskService({ userId });
  const result = await aiTaskService.deleteAITask(id);

  if (result.error) {
    if (result.error.message === 'AI task not found') {
      return NextResponse.json({ error: 'AI task not found' }, { status: 404 });
    }
    throw result.error;
  }

  return NextResponse.json({
    success: true
  });
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetAITask, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 300 // High limit for individual views
  }
});

export const PUT = withStandardMiddleware(handleUpdateAITask, {
  validation: { bodySchema: AITaskUpdateSchema },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100 // Moderate limit for updates
  }
});

export const DELETE = withStandardMiddleware(handleDeleteAITask, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 50 // Lower limit for deletions
  }
});

// Explicit OPTIONS handler for CORS preflight
export const OPTIONS = withStandardMiddleware(async () => {
  return new NextResponse(null, { status: 200 });
}, {
  auth: false // OPTIONS requests don't need authentication
});
