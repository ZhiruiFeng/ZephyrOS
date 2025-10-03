import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createMemoryService } from '@/services';
import { MemoryUpdateSchema } from '@/validation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/memories/[id] - Get a specific memory by ID
 */
async function handleGetMemory(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const userId = request.userId!;

  const memoryService = createMemoryService({ userId });
  const result = await memoryService.findMemoryById(id);

  if (result.error) {
    if (result.error.message === 'Memory not found') {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }
    throw result.error;
  }

  return NextResponse.json(result.data);
}

/**
 * PUT /api/memories/[id] - Update a specific memory
 */
async function handleUpdateMemory(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const data = request.validatedBody!;
  const userId = request.userId!;

  const memoryService = createMemoryService({ userId });
  const result = await memoryService.updateMemory(id, data);

  if (result.error) {
    if (result.error.message === 'Memory not found') {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }
    throw result.error;
  }

  return NextResponse.json(result.data);
}

/**
 * DELETE /api/memories/[id] - Delete a specific memory (soft delete)
 */
async function handleDeleteMemory(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const userId = request.userId!;

  const memoryService = createMemoryService({ userId });
  const result = await memoryService.deleteMemory(id);

  if (result.error) {
    if (result.error.message === 'Memory not found') {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }
    throw result.error;
  }

  return NextResponse.json({ message: 'Memory deleted successfully' });
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetMemory, {
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 300 // GET requests - higher limit
  }
});

export const PUT = withStandardMiddleware(handleUpdateMemory, {
  validation: { bodySchema: MemoryUpdateSchema },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100 // PUT requests - moderate limit
  }
});

export const DELETE = withStandardMiddleware(handleDeleteMemory, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 50 // DELETE requests - stricter limit
  }
});

// Explicit OPTIONS handler for CORS preflight
export const OPTIONS = withStandardMiddleware(async () => {
  return new NextResponse(null, { status: 200 });
}, {
  auth: false // OPTIONS requests don't need authentication
});
