import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createExecutorService } from '@/services';
import { ExecutorSchemas } from '@/validation';
import { ServiceUtils } from '@/services';

async function handleGetWorkspaceEvents(
  request: EnhancedRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const userId = request.userId!;
  const workspaceId = params.id;
  const query = request.validatedQuery || {};

  const context = ServiceUtils.createContext(userId, request.headers.get('x-request-id') || undefined);
  const executorService = createExecutorService(context);

  const result = await executorService.listEvents(workspaceId, query);

  if (result.error) throw result.error;

  return NextResponse.json({
    events: result.data || []
  });
}

async function handleLogEvent(
  request: EnhancedRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const userId = request.userId!;
  const workspaceId = params.id;
  const eventData = request.validatedBody;

  const context = ServiceUtils.createContext(userId, request.headers.get('x-request-id') || undefined);
  const executorService = createExecutorService(context);

  const result = await executorService.logEvent({
    ...eventData,
    workspace_id: workspaceId
  });

  if (result.error) throw result.error;

  return NextResponse.json({
    success: true
  }, { status: 201 });
}

export const GET = withStandardMiddleware(handleGetWorkspaceEvents, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 300 }
});

export const POST = withStandardMiddleware(handleLogEvent, {
  validation: { bodySchema: ExecutorSchemas.Event.Create },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 500 }
});
