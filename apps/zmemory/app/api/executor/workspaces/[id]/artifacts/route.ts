import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createExecutorService } from '@/services';
import { ExecutorSchemas } from '@/validation';
import { ServiceUtils } from '@/services';

async function handleGetWorkspaceArtifacts(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const userId = request.userId!;
  const { id: workspaceId } = await params;
  const query = request.validatedQuery || {};

  const context = ServiceUtils.createContext(userId, request.headers.get('x-request-id') || undefined);
  const executorService = createExecutorService(context);

  const result = await executorService.listArtifacts(workspaceId, query);

  if (result.error) throw result.error;

  return NextResponse.json({
    artifacts: result.data || []
  });
}

async function handleUploadArtifact(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const userId = request.userId!;
  const { id: workspaceId } = await params;
  const artifactData = request.validatedBody;

  const context = ServiceUtils.createContext(userId, request.headers.get('x-request-id') || undefined);
  const executorService = createExecutorService(context);

  const result = await executorService.uploadArtifact({
    ...artifactData,
    workspace_id: workspaceId
  });

  if (result.error) throw result.error;

  return NextResponse.json({
    artifact: result.data
  }, { status: 201 });
}

export const GET = withStandardMiddleware(handleGetWorkspaceArtifacts, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 300 }
});

export const POST = withStandardMiddleware(handleUploadArtifact, {
  validation: { bodySchema: ExecutorSchemas.Artifact.Create },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 200 }
});

export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
