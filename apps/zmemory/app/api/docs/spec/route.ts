import { NextResponse } from 'next/server';
import { withPublicMiddleware } from '@/middleware';
import { getApiDocs } from '@/lib/swagger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/docs/spec - OpenAPI specification endpoint
 *
 * Returns the OpenAPI/Swagger specification for the API.
 * Public endpoint accessible without authentication.
 */
async function handleGetApiSpec(): Promise<NextResponse> {
  const spec = await getApiDocs();
  return NextResponse.json(spec);
}

// Apply public middleware (CORS enabled, no auth required)
export const GET = withPublicMiddleware(handleGetApiSpec, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
  }
});
