import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createEnergyDayService } from '@/services';

/**
 * GET /api/energy-days/[date]
 */
async function handleGetEnergyDay(
  request: EnhancedRequest,
  { params }: { params: Promise<{ date: string }> }
): Promise<NextResponse> {
  const { date } = await params;
  const userId = request.userId!; // Already authenticated by middleware

  const energyDayService = createEnergyDayService({ userId });
  const result = await energyDayService.getEnergyDay(date);

  if (result.error) {
    throw result.error; // Middleware will handle error formatting
  }

  return NextResponse.json(result.data || null);
}

/**
 * PUT /api/energy-days/[date] -> upsert full day
 */
async function handleUpsertEnergyDayByDate(
  request: EnhancedRequest,
  { params }: { params: Promise<{ date: string }> }
): Promise<NextResponse> {
  const { date } = await params;
  const userId = request.userId!; // Already authenticated by middleware
  const body = await request.json();

  // Ensure the date from URL is used
  const energyDayService = createEnergyDayService({ userId });
  const result = await energyDayService.upsertEnergyDay({
    ...body,
    local_date: date
  });

  if (result.error) {
    throw result.error; // Middleware will handle error formatting
  }

  return NextResponse.json(result.data);
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetEnergyDay, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 300 } // 300 requests per 15 minutes
});

export const PUT = withStandardMiddleware(handleUpsertEnergyDayByDate, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 100 } // 100 updates per 15 minutes
});

// Explicit OPTIONS handler for preflight requests
export const OPTIONS = withStandardMiddleware(async () => {
  return new NextResponse(null, { status: 200 });
}, {
  auth: false,
  rateLimit: false
});
