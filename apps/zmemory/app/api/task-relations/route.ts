import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createTaskRelationService } from '@/services';
import { CreateTaskRelationSchema, TaskRelationQuerySchema } from '@/validation';

/**
 * GET /api/task-relations - Get task relations for the authenticated user
 */
async function handleGetRelations(request: EnhancedRequest): Promise<NextResponse> {
  const userId = request.userId!; // Already authenticated by middleware
  const filters = request.validatedQuery; // Already validated by middleware

  const taskRelationService = createTaskRelationService({ userId });
  const result = await taskRelationService.getRelations(filters);

  if (result.error) {
    throw result.error; // Middleware will handle error formatting
  }

  return NextResponse.json({ relations: result.data || [] });
}

/**
 * POST /api/task-relations - Create a new task relation
 */
async function handleCreateRelation(request: EnhancedRequest): Promise<NextResponse> {
  const userId = request.userId!; // Already authenticated by middleware
  const data = request.validatedBody; // Already validated by middleware

  const taskRelationService = createTaskRelationService({ userId });
  const result = await taskRelationService.createRelation(data);

  if (result.error) {
    throw result.error; // Middleware will handle error formatting
  }

  return NextResponse.json({ relation: result.data }, { status: 201 });
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetRelations, {
  validation: { querySchema: TaskRelationQuerySchema },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 300 } // 300 requests per 15 minutes
});

export const POST = withStandardMiddleware(handleCreateRelation, {
  validation: { bodySchema: CreateTaskRelationSchema },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 100 } // 100 creates per 15 minutes
});

// Explicit OPTIONS handler for preflight requests
export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
