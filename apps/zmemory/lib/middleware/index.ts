// ===== Middleware Layer Exports =====
// This file provides a central export point for all middleware utilities

// Authentication middleware
export * from './auth-middleware';

// CORS middleware
export * from './cors-middleware';

// Validation middleware
export * from './validation-middleware';

// Error handling middleware
export * from './error-handling';

// Rate limiting middleware
export * from './rate-limiting';

// Middleware composition utilities
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest, type AuthMiddlewareOptions } from './auth-middleware';
import { withCors, type CorsMiddlewareOptions } from './cors-middleware';
import { withValidation, type ValidatedRequest, type ValidationMiddlewareOptions } from './validation-middleware';
import { withErrorHandling, type ErrorHandlingOptions } from './error-handling';
import { withRateLimit, type RateLimitConfig } from './rate-limiting';

/**
 * Comprehensive middleware options for route handlers
 */
export interface MiddlewareOptions {
  auth?: AuthMiddlewareOptions | boolean;
  cors?: CorsMiddlewareOptions | boolean;
  validation?: ValidationMiddlewareOptions;
  errorHandling?: ErrorHandlingOptions | boolean;
  rateLimit?: RateLimitConfig | boolean;
}

/**
 * Enhanced request type with all middleware enhancements
 */
export interface EnhancedRequest extends AuthenticatedRequest, ValidatedRequest {
  // Combines all middleware request enhancements
}

/**
 * Compose multiple middleware functions into a single middleware
 */
export function composeMiddleware<THandler extends (request: EnhancedRequest, ...args: any[]) => Promise<NextResponse>>(
  handler: THandler,
  options: MiddlewareOptions = {}
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  let composedHandler: any = handler;

  // Apply middleware in reverse order (last applied = first executed)

  // 5. Error handling (outermost - catches all errors)
  if (options.errorHandling !== false) {
    const errorOptions = options.errorHandling === true || !options.errorHandling
      ? process.env.NODE_ENV === 'development' ? { includeStackTrace: true } : { includeStackTrace: false }
      : options.errorHandling;
    composedHandler = withErrorHandling(composedHandler, errorOptions);
  }

  // 4. CORS (handles all responses)
  if (options.cors !== false) {
    const corsOptions = options.cors === true || !options.cors ? {} : options.cors;
    composedHandler = withCors(composedHandler, corsOptions);
  }

  // 3. Rate limiting (before validation to prevent abuse)
  if (options.rateLimit) {
    const rateLimitConfig = options.rateLimit === true
      ? { windowMs: 15 * 60 * 1000, maxRequests: 300 } // Default moderate rate limit
      : options.rateLimit;
    composedHandler = withRateLimit(composedHandler, rateLimitConfig);
  }

  // 2. Validation (before auth to fail fast on invalid input)
  if (options.validation) {
    composedHandler = withValidation(composedHandler, options.validation);
  }

  // 1. Authentication (innermost - closest to handler)
  if (options.auth !== false) {
    const authOptions = options.auth === true || !options.auth ? {} : options.auth;
    composedHandler = withAuth(composedHandler, authOptions);
  }

  return composedHandler;
}

/**
 * Standard API middleware configuration
 */
export function withStandardMiddleware<THandler extends (request: EnhancedRequest, ...args: any[]) => Promise<NextResponse>>(
  handler: THandler,
  customOptions: Partial<MiddlewareOptions> = {}
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  const defaultOptions: MiddlewareOptions = {
    auth: true,
    cors: true,
    errorHandling: true,
    rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 300 }
  };

  return composeMiddleware(handler, { ...defaultOptions, ...customOptions });
}

/**
 * Public API middleware (no authentication required)
 */
export function withPublicMiddleware<THandler extends (request: EnhancedRequest, ...args: any[]) => Promise<NextResponse>>(
  handler: THandler,
  customOptions: Partial<MiddlewareOptions> = {}
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  const defaultOptions: MiddlewareOptions = {
    auth: false,
    cors: true,
    errorHandling: true,
    rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 100 }
  };

  return composeMiddleware(handler, { ...defaultOptions, ...customOptions });
}

/**
 * Admin API middleware (strict authentication and rate limiting)
 */
export function withAdminMiddleware<THandler extends (request: EnhancedRequest, ...args: any[]) => Promise<NextResponse>>(
  handler: THandler,
  adminUserIds: string[] = [],
  customOptions: Partial<MiddlewareOptions> = {}
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  const defaultOptions: MiddlewareOptions = {
    auth: { requireAuth: true },
    cors: true,
    errorHandling: true,
    rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 50 }
  };

  const composedHandler = composeMiddleware(handler, { ...defaultOptions, ...customOptions });

  // Add admin check after other middleware
  return async (request: NextRequest, ...args: any[]) => {
    const response = await composedHandler(request, ...args);

    // Check admin access (this would ideally be in auth middleware)
    const userId = (request as any).userId;
    if (adminUserIds.length > 0 && userId && !adminUserIds.includes(userId)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    return response;
  };
}

/**
 * Search endpoint middleware (optimized for search operations)
 */
export function withSearchMiddleware<THandler extends (request: EnhancedRequest, ...args: any[]) => Promise<NextResponse>>(
  handler: THandler,
  customOptions: Partial<MiddlewareOptions> = {}
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  const defaultOptions: MiddlewareOptions = {
    auth: true,
    cors: true,
    errorHandling: true,
    rateLimit: { windowMs: 1 * 60 * 1000, maxRequests: 30 } // Stricter for search
  };

  return composeMiddleware(handler, { ...defaultOptions, ...customOptions });
}

/**
 * Upload endpoint middleware (strict rate limiting)
 */
export function withUploadMiddleware<THandler extends (request: EnhancedRequest, ...args: any[]) => Promise<NextResponse>>(
  handler: THandler,
  customOptions: Partial<MiddlewareOptions> = {}
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  const defaultOptions: MiddlewareOptions = {
    auth: true,
    cors: true,
    errorHandling: true,
    rateLimit: { windowMs: 5 * 60 * 1000, maxRequests: 10 } // Very strict for uploads
  };

  return composeMiddleware(handler, { ...defaultOptions, ...customOptions });
}

/**
 * Development middleware (includes detailed error information)
 */
export function withDevMiddleware<THandler extends (request: EnhancedRequest, ...args: any[]) => Promise<NextResponse>>(
  handler: THandler,
  customOptions: Partial<MiddlewareOptions> = {}
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  const defaultOptions: MiddlewareOptions = {
    auth: { devFallbackUserId: 'dev-user-123' },
    cors: true,
    errorHandling: { includeStackTrace: true, logErrors: true },
    rateLimit: false // No rate limiting in development
  };

  return composeMiddleware(handler, { ...defaultOptions, ...customOptions });
}

/**
 * Production middleware (secure defaults)
 */
export function withProdMiddleware<THandler extends (request: EnhancedRequest, ...args: any[]) => Promise<NextResponse>>(
  handler: THandler,
  customOptions: Partial<MiddlewareOptions> = {}
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  const defaultOptions: MiddlewareOptions = {
    auth: { requireAuth: true },
    cors: true,
    errorHandling: { includeStackTrace: false, logErrors: true },
    rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 100 }
  };

  return composeMiddleware(handler, { ...defaultOptions, ...customOptions });
}

/**
 * Higher-order function for creating custom middleware compositions
 */
export function createMiddlewareComposition(defaultOptions: MiddlewareOptions) {
  return function <THandler extends (request: EnhancedRequest, ...args: any[]) => Promise<NextResponse>>(
    handler: THandler,
    customOptions: Partial<MiddlewareOptions> = {}
  ): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
    return composeMiddleware(handler, { ...defaultOptions, ...customOptions });
  };
}

/**
 * Utility functions for middleware management
 */
export const MiddlewareUtils = {
  /**
   * Check if request is from development environment
   */
  isDevelopment: (): boolean => process.env.NODE_ENV === 'development',

  /**
   * Check if request is from production environment
   */
  isProduction: (): boolean => process.env.NODE_ENV === 'production',

  /**
   * Create environment-specific middleware
   */
  createEnvironmentMiddleware: <THandler extends (request: EnhancedRequest, ...args: any[]) => Promise<NextResponse>>(
    handler: THandler,
    devOptions: Partial<MiddlewareOptions> = {},
    prodOptions: Partial<MiddlewareOptions> = {}
  ): (request: NextRequest, ...args: any[]) => Promise<NextResponse> => {
    if (process.env.NODE_ENV === 'development') {
      return withDevMiddleware(handler, devOptions);
    } else {
      return withProdMiddleware(handler, prodOptions);
    }
  },

  /**
   * Create middleware with conditional authentication
   */
  createConditionalAuthMiddleware: <THandler extends (request: EnhancedRequest, ...args: any[]) => Promise<NextResponse>>(
    handler: THandler,
    condition: (request: NextRequest) => boolean,
    options: Partial<MiddlewareOptions> = {}
  ): (request: NextRequest, ...args: any[]) => Promise<NextResponse> => {
    return async (request: NextRequest, ...args: any[]) => {
      const requireAuth = condition(request);
      const middlewareOptions = {
        ...options,
        auth: requireAuth ? { requireAuth: true } : { requireAuth: false }
      };
      return composeMiddleware(handler, middlewareOptions)(request, ...args);
    };
  }
};