import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createExecutorService } from '@/services';
import { ExecutorSchemas } from '@/validation';
import { ServiceUtils } from '@/services';

async function handleGetDevices(request: EnhancedRequest): Promise<NextResponse> {
  const query = request.validatedQuery || {};
  const userId = request.userId!;

  const context = ServiceUtils.createContext(userId, request.headers.get('x-request-id') || undefined);
  const executorService = createExecutorService(context);

  const result = await executorService.listDevices(query);

  if (result.error) throw result.error;

  return NextResponse.json({
    devices: result.data || []
  });
}

async function handleRegisterDevice(request: EnhancedRequest): Promise<NextResponse> {
  const deviceData = request.validatedBody;
  const userId = request.userId!;

  const context = ServiceUtils.createContext(userId, request.headers.get('x-request-id') || undefined);
  const executorService = createExecutorService(context);

  const result = await executorService.registerDevice(deviceData);

  if (result.error) throw result.error;

  return NextResponse.json({
    device: result.data
  }, { status: 201 });
}

export const GET = withStandardMiddleware(handleGetDevices, {
  validation: { querySchema: ExecutorSchemas.Device.Query },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 300 }
});

export const POST = withStandardMiddleware(handleRegisterDevice, {
  validation: { bodySchema: ExecutorSchemas.Device.Create },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 50 }
});

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
