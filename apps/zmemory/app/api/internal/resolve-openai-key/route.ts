import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { resolveOpenAIKey } from '@/lib/services/api-key-resolver';

export const dynamic = 'force-dynamic';

/**
 * GET /api/internal/resolve-openai-key - Resolve the user's OpenAI API key
 *
 * Internal endpoint to resolve the user's OpenAI API key.
 * Note: Intentionally DOES NOT include CORS headers to prevent browser access.
 * Server-to-server fetches are not subject to CORS.
 */
async function handleResolveOpenAIKey(
  request: EnhancedRequest
): Promise<NextResponse> {
  const userId = request.userId!;

  const { searchParams } = new URL(request.url);
  const service = searchParams.get('service') || undefined;

  const resolved = await resolveOpenAIKey(userId, service);

  if (!resolved) {
    return NextResponse.json({ error: 'No OpenAI API key configured' }, { status: 404 });
  }

  // Return the raw key for server-side use only
  return NextResponse.json({
    key: resolved.key,
    source: resolved.source,
  });
}

// Apply middleware
// Note: This is an internal endpoint, so we don't add CORS headers
export const GET = withStandardMiddleware(handleResolveOpenAIKey, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
  },
  cors: false // Disable CORS for internal endpoints
});
