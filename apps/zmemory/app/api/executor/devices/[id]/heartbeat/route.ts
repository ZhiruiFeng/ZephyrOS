import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createExecutorService } from '@/services';
import { ServiceUtils } from '@/services';

async function handleDeviceHeartbeat(
  request: EnhancedRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const userId = request.userId!;
  const deviceId = params.id;

  const context = ServiceUtils.createContext(userId, request.headers.get('x-request-id') || undefined);
  const executorService = createExecutorService(context);

  const result = await executorService.sendDeviceHeartbeat(deviceId);

  if (result.error) throw result.error;

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString()
  });
}

export const POST = withStandardMiddleware(handleDeviceHeartbeat, {
  rateLimit: { windowMs: 60 * 1000, maxRequests: 10 } // 10 heartbeats per minute max
});
