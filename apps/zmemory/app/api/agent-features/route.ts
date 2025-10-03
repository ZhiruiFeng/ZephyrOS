import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createAgentFeaturesService } from '@/services';
import { agentFeaturesQuerySchema } from '@/lib/validation/agent-features';

/**
 * Handle agent features request
 */
async function handleAgentFeaturesRequest(request: EnhancedRequest): Promise<NextResponse> {
  // Parse and validate query parameters
  const { searchParams } = new URL(request.url);
  const queryParams = Object.fromEntries(searchParams.entries());
  const validatedParams = agentFeaturesQuerySchema.parse(queryParams);

  // Create service instance
  const agentFeaturesService = createAgentFeaturesService({
    userId: request.userId!
  });

  // Get features using service
  const result = await agentFeaturesService.getFeatures({
    category: validatedParams.category,
    is_active: validatedParams.is_active,
    group_by_category: validatedParams.group_by_category
  });

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  // Return appropriate response format
  if (validatedParams.group_by_category && result.data && typeof result.data === 'object' && 'features' in result.data) {
    return NextResponse.json(result.data);
  }

  return NextResponse.json({ features: result.data });
}

// Apply standard middleware with authentication and rate limiting
export const GET = withStandardMiddleware(handleAgentFeaturesRequest, {
  validation: { querySchema: agentFeaturesQuerySchema },
  rateLimit: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 100 // Allow frequent feature requests
  }
});

// Explicit OPTIONS handler for preflight requests
export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
