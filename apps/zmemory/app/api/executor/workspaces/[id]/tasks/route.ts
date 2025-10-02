import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createExecutorService } from '@/services';
import { ExecutorSchemas } from '@/validation';
import { ServiceUtils } from '@/services';

async function handleGetWorkspaceTasks(
  request: EnhancedRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const userId = request.userId!;
  const workspaceId = params.id;

  const context = ServiceUtils.createContext(userId, request.headers.get('x-request-id') || undefined);
  const executorService = createExecutorService(context);

  const result = await executorService.listWorkspaceTasks(workspaceId);

  if (result.error) throw result.error;

  return NextResponse.json({
    tasks: result.data || []
  });
}

async function handleAssignTask(
  request: EnhancedRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const userId = request.userId!;
  const workspaceId = params.id;
  const taskData = request.validatedBody;

  const context = ServiceUtils.createContext(userId, request.headers.get('x-request-id') || undefined);
  const executorService = createExecutorService(context);

  const { ai_task_id, ...config } = taskData;
  const result = await executorService.assignTask(workspaceId, ai_task_id, config);

  if (result.error) throw result.error;

  return NextResponse.json({
    task: result.data
  }, { status: 201 });
}

export const GET = withStandardMiddleware(handleGetWorkspaceTasks, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 300 }
});

export const POST = withStandardMiddleware(handleAssignTask, {
  validation: { bodySchema: ExecutorSchemas.WorkspaceTask.Create },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 100 }
});
