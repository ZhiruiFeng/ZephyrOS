import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createTaskService } from '@/services';
import { UpdateTaskSchema } from '@/validation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tasks/[id] - Get a specific task by ID
 */
async function handleGetTask(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const userId = request.userId!;

  const taskService = createTaskService({ userId });
  const result = await taskService.findTaskById(id);

  if (result.error) {
    if (result.error.message === 'Task not found') {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    throw result.error;
  }

  return NextResponse.json(result.data);
}

/**
 * PUT /api/tasks/[id] - Update a specific task
 */
async function handleUpdateTask(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const data = request.validatedBody!;
  const userId = request.userId!;

  const taskService = createTaskService({ userId });
  const result = await taskService.updateTask(id, data);

  if (result.error) {
    if (result.error.message === 'Task not found') {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    throw result.error;
  }

  return NextResponse.json(result.data);
}

/**
 * DELETE /api/tasks/[id] - Delete a specific task
 */
async function handleDeleteTask(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const userId = request.userId!;

  const taskService = createTaskService({ userId });
  const result = await taskService.deleteTask(id);

  if (result.error) {
    if (result.error.message === 'Task not found') {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    throw result.error;
  }

  return NextResponse.json({
    message: 'Task deleted successfully',
    id
  });
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetTask, {
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 300 // GET requests - higher limit
  }
});

export const PUT = withStandardMiddleware(handleUpdateTask, {
  validation: { bodySchema: UpdateTaskSchema },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100 // PUT requests - moderate limit
  }
});

export const DELETE = withStandardMiddleware(handleDeleteTask, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 50 // DELETE requests - stricter limit
  }
});

// Explicit OPTIONS handler for CORS preflight
export const OPTIONS = withStandardMiddleware(async () => {
  return new NextResponse(null, { status: 200 });
}, {
  auth: false // OPTIONS requests don't need authentication
});
