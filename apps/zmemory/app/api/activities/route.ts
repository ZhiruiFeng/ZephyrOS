import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createActivityService } from '@/services';
import {
  ActivitiesQuerySchema,
  ActivityCreateSchema
} from '@/validation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/activities - Get user's activities with optional filtering
 */
async function handleGetActivities(request: EnhancedRequest): Promise<NextResponse> {
  const query = request.validatedQuery!;
  const userId = request.userId!;

  const activityService = createActivityService({ userId });
  const result = await activityService.getActivities(query);

  if (result.error) {
    throw result.error;
  }

  return NextResponse.json({
    activities: result.data || [],
    count: result.data?.length || 0
  });
}

/**
 * POST /api/activities - Create a new activity
 */
async function handleCreateActivity(request: EnhancedRequest): Promise<NextResponse> {
  const data = request.validatedBody!;
  const userId = request.userId!;

  const activityService = createActivityService({ userId });
  const result = await activityService.createActivity(data);

  if (result.error) {
    throw result.error;
  }

  return NextResponse.json(
    {
      activity: result.data
    },
    { status: 201 }
  );
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetActivities, {
  validation: { querySchema: ActivitiesQuerySchema },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 300 // GET requests - higher limit for listing
  }
});

export const POST = withStandardMiddleware(handleCreateActivity, {
  validation: { bodySchema: ActivityCreateSchema },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100 // POST requests - moderate limit
  }
});

// Explicit OPTIONS handler for CORS preflight
export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
