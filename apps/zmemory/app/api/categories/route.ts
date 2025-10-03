import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createCategoryService } from '@/services';
import { CreateCategorySchema, CategoryQuerySchema } from '@/validation';

/**
 * GET /api/categories - Get all categories for the authenticated user
 */
async function handleGetCategories(request: EnhancedRequest): Promise<NextResponse> {
  const userId = request.userId!; // Already authenticated by middleware
  const filters = request.validatedQuery; // Already validated by middleware

  const categoryService = createCategoryService({ userId });
  const result = await categoryService.getCategories(filters);

  if (result.error) {
    throw result.error; // Middleware will handle error formatting
  }

  return NextResponse.json({ categories: result.data || [] });
}

/**
 * POST /api/categories - Create a new category
 */
async function handleCreateCategory(request: EnhancedRequest): Promise<NextResponse> {
  const userId = request.userId!; // Already authenticated by middleware
  const data = request.validatedBody; // Already validated by middleware

  const categoryService = createCategoryService({ userId });
  const result = await categoryService.createCategory(data);

  if (result.error) {
    throw result.error; // Middleware will handle error formatting
  }

  return NextResponse.json({ category: result.data }, { status: 201 });
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetCategories, {
  validation: { querySchema: CategoryQuerySchema },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 300 } // 300 requests per 15 minutes
});

export const POST = withStandardMiddleware(handleCreateCategory, {
  validation: { bodySchema: CreateCategorySchema },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 50 } // 50 creates per 15 minutes
});

// Explicit OPTIONS handler for preflight requests
export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
