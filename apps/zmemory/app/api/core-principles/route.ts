import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createCorePrincipleService, ServiceUtils } from '@/services';
import {
  CreateCorePrincipleSchema,
  CorePrincipleQuerySchema
} from '@/lib/types/core-principles-types';

async function handleGet(request: EnhancedRequest): Promise<NextResponse> {
  const userId = request.userId!;
  const query = request.validatedQuery || {};

  const context = ServiceUtils.createContext(userId, request.headers.get('x-request-id') || undefined);
  const corePrincipleService = createCorePrincipleService(context);

  const result = await corePrincipleService.listPrinciples(query);

  if (result.error) throw result.error;

  return NextResponse.json(result.data || []);
}

async function handlePost(request: EnhancedRequest): Promise<NextResponse> {
  const userId = request.userId!;
  const data = request.validatedBody;

  const context = ServiceUtils.createContext(userId, request.headers.get('x-request-id') || undefined);
  const corePrincipleService = createCorePrincipleService(context);

  const result = await corePrincipleService.createPrinciple(data);

  if (result.error) throw result.error;

  return NextResponse.json(result.data, { status: 201 });
}

export const GET = withStandardMiddleware(handleGet, {
  validation: { querySchema: CorePrincipleQuerySchema },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 300 }
});

export const POST = withStandardMiddleware(handlePost, {
  validation: { bodySchema: CreateCorePrincipleSchema },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 50 }
});

export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
