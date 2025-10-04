import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createDailyStrategyService, ServiceUtils } from '@/services';
import {
  CreateDailyStrategySchema,
  DailyStrategyQuerySchema
} from '@/lib/types/daily-strategy-types';

export const dynamic = 'force-dynamic';

async function handleGet(request: EnhancedRequest): Promise<NextResponse> {
  const userId = request.userId!;
  const query = request.validatedQuery || {};

  const context = ServiceUtils.createContext(userId, request.headers.get('x-request-id') || undefined);
  const dailyStrategyService = createDailyStrategyService(context);

  const result = await dailyStrategyService.listStrategies(query);

  if (result.error) throw result.error;

  return NextResponse.json({
    items: result.data || [],
    count: (result.data || []).length,
    has_more: (result.data || []).length === (query.limit || 20)
  });
}

async function handlePost(request: EnhancedRequest): Promise<NextResponse> {
  const userId = request.userId!;
  const data = request.validatedBody;

  const context = ServiceUtils.createContext(userId, request.headers.get('x-request-id') || undefined);
  const dailyStrategyService = createDailyStrategyService(context);

  const result = await dailyStrategyService.createStrategy(data);

  if (result.error) throw result.error;

  return NextResponse.json({ item: result.data }, { status: 201 });
}

export const GET = withStandardMiddleware(handleGet, {
  validation: { querySchema: DailyStrategyQuerySchema },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 300 }
});

export const POST = withStandardMiddleware(handlePost, {
  validation: { bodySchema: CreateDailyStrategySchema },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 50 }
});

export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
