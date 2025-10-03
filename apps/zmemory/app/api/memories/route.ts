import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createMemoryService } from '@/services';
import { MemoriesQuerySchema, MemoryCreateSchema } from '@/validation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/memories - Get user's memories with advanced filtering and search
 */
async function handleGetMemories(request: EnhancedRequest): Promise<NextResponse> {
  const query = request.validatedQuery!;
  const userId = request.userId!;

  const memoryService = createMemoryService({ userId });

  // Parse numeric and boolean parameters
  const filters = {
    ...query,
    is_highlight: query.is_highlight === 'true' ? true : query.is_highlight === 'false' ? false : undefined,
    near_lat: query.near_lat ? parseFloat(query.near_lat as string) : undefined,
    near_lng: query.near_lng ? parseFloat(query.near_lng as string) : undefined,
    distance_km: query.distance_km ? parseFloat(query.distance_km as string) : undefined,
    min_emotion_valence: query.min_emotion_valence ? parseInt(query.min_emotion_valence as string) : undefined,
    max_emotion_valence: query.max_emotion_valence ? parseInt(query.max_emotion_valence as string) : undefined,
    min_salience: query.min_salience ? parseFloat(query.min_salience as string) : undefined,
    limit: query.limit ? parseInt(query.limit as string) : 50,
    offset: query.offset ? parseInt(query.offset as string) : 0
  };

  const result = await memoryService.findMemories(filters);

  if (result.error) {
    throw result.error;
  }

  return NextResponse.json(result.data || []);
}

/**
 * POST /api/memories - Create a new memory
 */
async function handleCreateMemory(request: EnhancedRequest): Promise<NextResponse> {
  const data = request.validatedBody!;
  const userId = request.userId!;

  const memoryService = createMemoryService({ userId });

  // MemoryRepository.createMemory handles happened_range transformation
  const result = await memoryService.createMemory(data);

  if (result.error) {
    throw result.error;
  }

  return NextResponse.json(result.data, { status: 201 });
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetMemories, {
  validation: { querySchema: MemoriesQuerySchema },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 300 // GET requests - higher limit for listing
  }
});

export const POST = withStandardMiddleware(handleCreateMemory, {
  validation: { bodySchema: MemoryCreateSchema },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100 // POST requests - moderate limit
  }
});

// Explicit OPTIONS handler for CORS preflight
export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
