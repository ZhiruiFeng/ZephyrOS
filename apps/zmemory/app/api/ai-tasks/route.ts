import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createAITaskService } from '@/services';
import { AITasksQuerySchema, AITaskCreateSchema } from '@/validation';

export const runtime = 'nodejs';

/**
 * Handle GET AI tasks request using new architecture
 */
async function handleGetAITasks(request: EnhancedRequest): Promise<NextResponse> {
  // Data is already validated and available on request via middleware
  const query = request.validatedQuery;
  const userId = request.userId!; // Authentication already handled

  // Create service instance
  const aiTaskService = createAITaskService({ userId });

  // Use service for business logic
  const result = await aiTaskService.findAITasks(query);

  if (result.error) {
    throw result.error; // Middleware handles error responses
  }

  return NextResponse.json({
    ai_tasks: result.data || []
  });
}

/**
 * Handle POST AI tasks request using new architecture
 */
async function handleCreateAITask(request: EnhancedRequest): Promise<NextResponse> {
  // Data is already validated and available on request via middleware
  const taskData = request.validatedBody;
  const userId = request.userId!; // Authentication already handled

  // Create service instance
  const aiTaskService = createAITaskService({ userId });

  // Use service for business logic
  const result = await aiTaskService.createAITask(taskData);

  if (result.error) {
    throw result.error; // Middleware handles error responses
  }

  return NextResponse.json({
    ai_task: result.data
  }, { status: 201 });
}

// Apply middleware stack with validation, auth, CORS, rate limiting, error handling
export const GET = withStandardMiddleware(handleGetAITasks, {
  validation: { querySchema: AITasksQuerySchema },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 300 // Same as legacy route
  }
});

export const POST = withStandardMiddleware(handleCreateAITask, {
  validation: { bodySchema: AITaskCreateSchema },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 50 // Stricter limit for POST (same as legacy)
  }
});

// Explicit OPTIONS handler for CORS preflight
export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
