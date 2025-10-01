import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createInteractionTypeService } from '@/services';

/**
 * GET /api/interaction-types - Get all available interaction types
 */
async function handleGetInteractionTypes(request: EnhancedRequest): Promise<NextResponse> {
  const userId = request.userId!; // Already authenticated by middleware

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || undefined;
  const isActiveParam = searchParams.get('is_active');
  const groupByCategory = searchParams.get('group_by_category') === 'true';

  const is_active = isActiveParam === null ? undefined : isActiveParam === 'true';

  const interactionTypeService = createInteractionTypeService({ userId });
  const result = await interactionTypeService.getInteractionTypes({
    category,
    is_active,
    group_by_category: groupByCategory
  });

  if (result.error) {
    throw result.error; // Middleware will handle error formatting
  }

  return NextResponse.json(result.data);
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetInteractionTypes, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 300 } // 300 requests per 15 minutes
});

// Explicit OPTIONS handler for preflight requests
export const OPTIONS = withStandardMiddleware(async () => {
  return new NextResponse(null, { status: 200 });
}, {
  auth: false,
  rateLimit: false
});
