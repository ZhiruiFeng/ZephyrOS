import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createExecutorService } from '@/services';
import { ExecutorSchemas } from '@/validation';
import { ServiceUtils } from '@/services';

async function handleGetWorkspace(
  request: EnhancedRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const userId = request.userId!;
  const workspaceId = params.id;

  const context = ServiceUtils.createContext(userId, request.headers.get('x-request-id') || undefined);
  const executorService = createExecutorService(context);

  const result = await executorService.getWorkspace(workspaceId);

  if (result.error) throw result.error;

  return NextResponse.json({
    workspace: result.data
  });
}

async function handleUpdateWorkspace(
  request: EnhancedRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const userId = request.userId!;
  const workspaceId = params.id;
  const updateData = request.validatedBody;

  const context = ServiceUtils.createContext(userId, request.headers.get('x-request-id') || undefined);
  const executorService = createExecutorService(context);

  const result = await executorService.updateWorkspace(workspaceId, updateData);

  if (result.error) throw result.error;

  return NextResponse.json({
    workspace: result.data
  });
}

async function handleDeleteWorkspace(
  request: EnhancedRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const userId = request.userId!;
  const workspaceId = params.id;

  const context = ServiceUtils.createContext(userId, request.headers.get('x-request-id') || undefined);
  const executorService = createExecutorService(context);

  const result = await executorService.deleteWorkspace(workspaceId);

  if (result.error) throw result.error;

  return NextResponse.json({
    success: true
  });
}

export const GET = withStandardMiddleware(handleGetWorkspace, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 300 }
});

export const PUT = withStandardMiddleware(handleUpdateWorkspace, {
  validation: { bodySchema: ExecutorSchemas.Workspace.Update },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 100 }
});

export const DELETE = withStandardMiddleware(handleDeleteWorkspace, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 50 }
});
