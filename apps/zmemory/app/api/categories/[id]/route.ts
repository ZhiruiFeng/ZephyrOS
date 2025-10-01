import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createCategoryService } from '@/services';
import { UpdateCategorySchema } from '@/validation';

/**
 * GET /api/categories/[id] - Get a single category
 */
async function handleGetCategory(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const userId = request.userId!; // Already authenticated by middleware

  const categoryService = createCategoryService({ userId });
  const result = await categoryService.getCategory(id);

  if (result.error) {
    throw result.error; // Middleware will handle error formatting
  }

  return NextResponse.json({ category: result.data });
}

/**
 * PUT /api/categories/[id] - Update a category
 */
async function handleUpdateCategory(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const userId = request.userId!; // Already authenticated by middleware
  const data = request.validatedBody; // Already validated by middleware

  const categoryService = createCategoryService({ userId });
  const result = await categoryService.updateCategory(id, data);

  if (result.error) {
    throw result.error; // Middleware will handle error formatting
  }

  return NextResponse.json({ category: result.data });
}

/**
 * DELETE /api/categories/[id] - Delete a category
 */
async function handleDeleteCategory(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const userId = request.userId!; // Already authenticated by middleware

  const categoryService = createCategoryService({ userId });
  const result = await categoryService.deleteCategory(id);

  if (result.error) {
    throw result.error; // Middleware will handle error formatting
  }

  return NextResponse.json({ message: '分类删除成功' });
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetCategory, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 300 } // 300 requests per 15 minutes
});

export const PUT = withStandardMiddleware(handleUpdateCategory, {
  validation: { bodySchema: UpdateCategorySchema },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 100 } // 100 updates per 15 minutes
});

export const DELETE = withStandardMiddleware(handleDeleteCategory, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 50 } // 50 deletes per 15 minutes
});

// Explicit OPTIONS handler for preflight requests
export const OPTIONS = withStandardMiddleware(async () => {
  return new NextResponse(null, { status: 200 });
}, {
  auth: false,
  rateLimit: false
});
