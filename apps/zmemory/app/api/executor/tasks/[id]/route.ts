import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createExecutorService } from '@/services';
import { ExecutorSchemas } from '@/validation';
import { ServiceUtils } from '@/services';

async function handleGetWorkspaceTask(
  request: EnhancedRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const userId = request.userId!;
  const taskId = params.id;

  const context = ServiceUtils.createContext(userId, request.headers.get('x-request-id') || undefined);
  const executorService = createExecutorService(context);

  const result = await executorService.getWorkspaceTask(taskId);

  if (result.error) throw result.error;

  return NextResponse.json({
    task: result.data
  });
}

async function handleUpdateWorkspaceTask(
  request: EnhancedRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const userId = request.userId!;
  const taskId = params.id;
  const updateData = request.validatedBody;

  const context = ServiceUtils.createContext(userId, request.headers.get('x-request-id') || undefined);
  const executorService = createExecutorService(context);

  const result = await executorService.updateWorkspaceTask(taskId, updateData);

  if (result.error) throw result.error;

  return NextResponse.json({
    task: result.data
  });
}

export const GET = withStandardMiddleware(handleGetWorkspaceTask, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 300 }
});

export const PUT = withStandardMiddleware(handleUpdateWorkspaceTask, {
  validation: { bodySchema: ExecutorSchemas.WorkspaceTask.Update },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 100 }
});
