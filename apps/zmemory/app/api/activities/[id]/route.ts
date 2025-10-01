import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createActivityService } from '@/services';
import { ActivityUpdateSchema } from '@/validation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/activities/[id] - Get a specific activity
 */
async function handleGetActivity(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const userId = request.userId!;

  if (!id) {
    const error = new Error('Activity ID is required');
    (error as any).code = '400';
    throw error;
  }

  const activityService = createActivityService({ userId });
  const result = await activityService.getActivity(id);

  if (result.error) {
    throw result.error;
  }

  return NextResponse.json({
    activity: result.data
  });
}

/**
 * PUT /api/activities/[id] - Update an activity
 */
async function handleUpdateActivity(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const updates = request.validatedBody!;
  const userId = request.userId!;

  if (!id) {
    const error = new Error('Activity ID is required');
    (error as any).code = '400';
    throw error;
  }

  const activityService = createActivityService({ userId });
  const result = await activityService.updateActivity(id, updates);

  if (result.error) {
    throw result.error;
  }

  return NextResponse.json({
    activity: result.data
  });
}

/**
 * DELETE /api/activities/[id] - Delete an activity
 */
async function handleDeleteActivity(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const userId = request.userId!;

  if (!id) {
    const error = new Error('Activity ID is required');
    (error as any).code = '400';
    throw error;
  }

  const activityService = createActivityService({ userId });
  const result = await activityService.deleteActivity(id);

  if (result.error) {
    throw result.error;
  }

  return NextResponse.json({
    success: true,
    message: 'Activity deleted successfully'
  });
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetActivity, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 300 // High limit for individual activity views
  }
});

export const PUT = withStandardMiddleware(handleUpdateActivity, {
  validation: { bodySchema: ActivityUpdateSchema },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100 // Moderate limit for updates
  }
});

export const DELETE = withStandardMiddleware(handleDeleteActivity, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 50 // Lower limit for deletions
  }
});

// Explicit OPTIONS handler for CORS preflight
export const OPTIONS = withStandardMiddleware(async () => {
  return new NextResponse(null, { status: 200 });
}, {
  auth: false // OPTIONS requests don't need authentication
});
