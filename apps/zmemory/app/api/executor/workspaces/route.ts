import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createExecutorService } from '@/services';
import { ExecutorSchemas } from '@/validation';
import { ServiceUtils } from '@/services';

async function handleGetWorkspaces(request: EnhancedRequest): Promise<NextResponse> {
  const query = request.validatedQuery || {};
  const userId = request.userId!;

  const context = ServiceUtils.createContext(userId, request.headers.get('x-request-id') || undefined);
  const executorService = createExecutorService(context);

  const result = await executorService.listWorkspaces(query);

  if (result.error) throw result.error;

  return NextResponse.json({
    workspaces: result.data || []
  });
}

async function handleCreateWorkspace(request: EnhancedRequest): Promise<NextResponse> {
  const workspaceData = request.validatedBody;
  const userId = request.userId!;

  const context = ServiceUtils.createContext(userId, request.headers.get('x-request-id') || undefined);
  const executorService = createExecutorService(context);

  const result = await executorService.createWorkspace(workspaceData);

  if (result.error) throw result.error;

  return NextResponse.json({
    workspace: result.data
  }, { status: 201 });
}

export const GET = withStandardMiddleware(handleGetWorkspaces, {
  validation: { querySchema: ExecutorSchemas.Workspace.Query },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 300 }
});

export const POST = withStandardMiddleware(handleCreateWorkspace, {
  validation: { bodySchema: ExecutorSchemas.Workspace.Create },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 50 }
});
