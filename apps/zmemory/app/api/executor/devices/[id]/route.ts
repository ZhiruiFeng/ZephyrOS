import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createExecutorService } from '@/services';
import { ExecutorSchemas } from '@/validation';
import { ServiceUtils } from '@/services';

async function handleGetDevice(
  request: EnhancedRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const userId = request.userId!;
  const deviceId = params.id;

  const context = ServiceUtils.createContext(userId, request.headers.get('x-request-id') || undefined);
  const executorService = createExecutorService(context);

  const result = await executorService.getDevice(deviceId);

  if (result.error) throw result.error;

  return NextResponse.json({
    device: result.data
  });
}

async function handleUpdateDevice(
  request: EnhancedRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const userId = request.userId!;
  const deviceId = params.id;
  const updateData = request.validatedBody;

  const context = ServiceUtils.createContext(userId, request.headers.get('x-request-id') || undefined);
  const executorService = createExecutorService(context);

  const result = await executorService.updateDevice(deviceId, updateData);

  if (result.error) throw result.error;

  return NextResponse.json({
    device: result.data
  });
}

async function handleDeleteDevice(
  request: EnhancedRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const userId = request.userId!;
  const deviceId = params.id;

  const context = ServiceUtils.createContext(userId, request.headers.get('x-request-id') || undefined);
  const executorService = createExecutorService(context);

  const result = await executorService.deleteDevice(deviceId);

  if (result.error) throw result.error;

  return NextResponse.json({
    success: true
  });
}

export const GET = withStandardMiddleware(handleGetDevice, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 300 }
});

export const PUT = withStandardMiddleware(handleUpdateDevice, {
  validation: { bodySchema: ExecutorSchemas.Device.Update },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 100 }
});

export const DELETE = withStandardMiddleware(handleDeleteDevice, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 50 }
});
