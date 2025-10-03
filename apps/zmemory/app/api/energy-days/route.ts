import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createEnergyDayService } from '@/services';

/**
 * GET /api/energy-days?start=YYYY-MM-DD&end=YYYY-MM-DD
 */
async function handleGetEnergyDays(request: EnhancedRequest): Promise<NextResponse> {
  const userId = request.userId!; // Already authenticated by middleware

  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start') || undefined;
  const end = searchParams.get('end') || undefined;
  const limit = parseInt(searchParams.get('limit') || '90', 10);

  const energyDayService = createEnergyDayService({ userId });
  const result = await energyDayService.getEnergyDays({ start, end, limit });

  if (result.error) {
    throw result.error; // Middleware will handle error formatting
  }

  return NextResponse.json(result.data || []);
}

/**
 * POST /api/energy-days -> upsert a day curve
 */
async function handleUpsertEnergyDay(request: EnhancedRequest): Promise<NextResponse> {
  const userId = request.userId!; // Already authenticated by middleware
  const body = await request.json();

  const energyDayService = createEnergyDayService({ userId });
  const result = await energyDayService.upsertEnergyDay(body);

  if (result.error) {
    throw result.error; // Middleware will handle error formatting
  }

  return NextResponse.json(result.data, { status: 201 });
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetEnergyDays, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 300 } // 300 requests per 15 minutes
});

export const POST = withStandardMiddleware(handleUpsertEnergyDay, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 100 } // 100 creates/updates per 15 minutes
});

// Explicit OPTIONS handler for preflight requests
export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
