import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createExecutorService } from '@/services';
import { ExecutorSchemas } from '@/validation';
import { ServiceUtils } from '@/services';

async function handleGetWorkspaceMetrics(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const userId = request.userId!;
  const { id: workspaceId } = await params;
  const query = request.validatedQuery || {};

  const context = ServiceUtils.createContext(userId, request.headers.get('x-request-id') || undefined);
  const executorService = createExecutorService(context);

  const result = await executorService.listMetrics(workspaceId, query);

  if (result.error) throw result.error;

  return NextResponse.json({
    metrics: result.data || []
  });
}

async function handleRecordMetrics(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const userId = request.userId!;
  const { id: workspaceId } = await params;
  const metricsData = request.validatedBody;

  const context = ServiceUtils.createContext(userId, request.headers.get('x-request-id') || undefined);
  const executorService = createExecutorService(context);

  const result = await executorService.recordMetrics({
    ...metricsData,
    workspace_id: workspaceId
  });

  if (result.error) throw result.error;

  return NextResponse.json({
    success: true
  }, { status: 201 });
}

export const GET = withStandardMiddleware(handleGetWorkspaceMetrics, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 300 }
});

export const POST = withStandardMiddleware(handleRecordMetrics, {
  validation: { bodySchema: ExecutorSchemas.Metric.Create },
  rateLimit: { windowMs: 60 * 1000, maxRequests: 100 } // Higher rate for metrics recording
});

export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
