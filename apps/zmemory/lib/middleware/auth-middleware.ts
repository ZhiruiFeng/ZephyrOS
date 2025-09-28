import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/auth';
import { jsonWithCors } from '@/lib/security';

export interface AuthenticatedRequest extends NextRequest {
  userId?: string;
}

export interface AuthMiddlewareOptions {
  requireAuth?: boolean;
  devFallbackUserId?: string;
  customUnauthorizedResponse?: (request: NextRequest) => NextResponse;
}

/**
 * Authentication middleware that extracts and validates user ID from request
 */
export function withAuth<THandler extends (request: AuthenticatedRequest, ...args: any[]) => Promise<NextResponse>>(
  handler: THandler,
  options: AuthMiddlewareOptions = {}
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  const {
    requireAuth = true,
    devFallbackUserId = 'dev-user-123',
    customUnauthorizedResponse
  } = options;

  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    try {
      // Extract user ID from request
      let userId = await getUserIdFromRequest(request);

      // Development fallback
      if (!userId && process.env.NODE_ENV !== 'production') {
        userId = devFallbackUserId;
      }

      // Check if authentication is required
      if (requireAuth && !userId) {
        if (customUnauthorizedResponse) {
          return customUnauthorizedResponse(request);
        }
        return jsonWithCors(request, { error: 'Authentication required' }, 401);
      }

      // Enhance request with userId
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.userId = userId || undefined;

      // Call the actual handler
      return await handler(authenticatedRequest, ...args);
    } catch (error) {
      console.error('Authentication middleware error:', error);
      return jsonWithCors(request, { error: 'Authentication failed' }, 401);
    }
  };
}

/**
 * Optional authentication middleware - doesn't require auth but provides userId if available
 */
export function withOptionalAuth<THandler extends (request: AuthenticatedRequest, ...args: any[]) => Promise<NextResponse>>(
  handler: THandler,
  devFallbackUserId: string = 'dev-user-123'
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  return withAuth(handler, {
    requireAuth: false,
    devFallbackUserId
  });
}

/**
 * Higher-order function for creating auth middleware with custom options
 */
export function createAuthMiddleware(options: AuthMiddlewareOptions) {
  return function <THandler extends (request: AuthenticatedRequest, ...args: any[]) => Promise<NextResponse>>(
    handler: THandler
  ): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
    return withAuth(handler, options);
  };
}

/**
 * Utility to check if request is authenticated
 */
export async function isAuthenticated(request: NextRequest): Promise<{ authenticated: boolean; userId?: string }> {
  try {
    let userId = await getUserIdFromRequest(request);

    // Development fallback
    if (!userId && process.env.NODE_ENV !== 'production') {
      userId = 'dev-user-123';
    }

    return {
      authenticated: !!userId,
      userId: userId || undefined
    };
  } catch (error) {
    return { authenticated: false };
  }
}

/**
 * Middleware for admin-only routes
 */
export function withAdminAuth<THandler extends (request: AuthenticatedRequest, ...args: any[]) => Promise<NextResponse>>(
  handler: THandler,
  adminUserIds: string[] = []
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  return withAuth(async (request: AuthenticatedRequest, ...args: any[]) => {
    const userId = request.userId!;

    // Check if user is admin
    const isAdmin = adminUserIds.length === 0 || adminUserIds.includes(userId);

    if (!isAdmin) {
      return jsonWithCors(request, { error: 'Admin access required' }, 403);
    }

    return handler(request, ...args);
  });
}

/**
 * Middleware for API key authentication
 */
export function withApiKeyAuth<THandler extends (request: AuthenticatedRequest, ...args: any[]) => Promise<NextResponse>>(
  handler: THandler,
  options: { headerName?: string; paramName?: string } = {}
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  const { headerName = 'x-api-key', paramName = 'api_key' } = options;

  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    try {
      // Try to get API key from header or query parameter
      const apiKey = request.headers.get(headerName) ||
                    new URL(request.url).searchParams.get(paramName);

      if (!apiKey) {
        return jsonWithCors(request, { error: 'API key required' }, 401);
      }

      // TODO: Validate API key against database
      // For now, we'll use the auth middleware after API key validation

      return withAuth(handler)(request, ...args);
    } catch (error) {
      console.error('API key authentication error:', error);
      return jsonWithCors(request, { error: 'API key authentication failed' }, 401);
    }
  };
}