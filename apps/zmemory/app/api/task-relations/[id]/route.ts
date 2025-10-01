import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createTaskRelationService } from '@/services';

/**
 * DELETE /api/task-relations/[id] - Delete a task relation
 */
async function handleDeleteRelation(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const userId = request.userId!; // Already authenticated by middleware

  const taskRelationService = createTaskRelationService({ userId });
  const result = await taskRelationService.deleteRelation(id);

  if (result.error) {
    throw result.error; // Middleware will handle error formatting
  }

  return NextResponse.json({ message: '任务关系删除成功' });
}

// Apply middleware
export const DELETE = withStandardMiddleware(handleDeleteRelation, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 100 } // 100 deletes per 15 minutes
});

// Explicit OPTIONS handler for preflight requests
export const OPTIONS = withStandardMiddleware(async () => {
  return new NextResponse(null, { status: 200 });
}, {
  auth: false,
  rateLimit: false
});
