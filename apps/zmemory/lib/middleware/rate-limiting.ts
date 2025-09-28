import { NextRequest, NextResponse } from 'next/server';
import { jsonWithCors, getClientIP, isRateLimited } from '@/lib/security';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (request: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  onLimitReached?: (request: NextRequest, key: string) => NextResponse | null;
  headers?: boolean; // Include rate limit headers in response
  message?: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  totalHits: number;
}

/**
 * Rate limiting middleware
 */
export function withRateLimit<THandler extends (request: NextRequest, ...args: any[]) => Promise<NextResponse>>(
  handler: THandler,
  config: RateLimitConfig
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  const {
    windowMs,
    maxRequests,
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    onLimitReached,
    headers = true,
    message = 'Too many requests'
  } = config;

  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    try {
      const key = keyGenerator(request);

      // Check if rate limited
      if (isRateLimited(key, windowMs, maxRequests)) {
        if (onLimitReached) {
          const customResponse = onLimitReached(request, key);
          if (customResponse) {
            return customResponse;
          }
        }

        const response = jsonWithCors(request, { error: message }, 429);

        if (headers) {
          addRateLimitHeaders(response, {
            limit: maxRequests,
            remaining: 0,
            resetTime: Date.now() + windowMs,
            totalHits: maxRequests + 1
          });
        }

        return response;
      }

      // Call the handler
      const response = await handler(request, ...args);

      // Add rate limit headers if enabled
      if (headers) {
        const info = getRateLimitInfo(key, windowMs, maxRequests);
        addRateLimitHeaders(response, info);
      }

      return response;
    } catch (error) {
      console.error('Rate limiting middleware error:', error);
      return jsonWithCors(request, { error: 'Rate limiting failed' }, 500);
    }
  };
}

/**
 * Default key generator using IP and route
 */
function defaultKeyGenerator(request: NextRequest): string {
  const ip = getClientIP(request);
  const pathname = new URL(request.url).pathname;
  return `${ip}:${request.method}:${pathname}`;
}

/**
 * Get current rate limit information for a key
 */
function getRateLimitInfo(key: string, windowMs: number, maxRequests: number): RateLimitInfo {
  // This is a simplified implementation
  // In a real application, you'd want to use Redis or a similar store
  const now = Date.now();

  return {
    limit: maxRequests,
    remaining: Math.max(0, maxRequests - 1), // Simplified calculation
    resetTime: now + windowMs,
    totalHits: 1 // Simplified
  };
}

/**
 * Add rate limit headers to response
 */
function addRateLimitHeaders(response: NextResponse, info: RateLimitInfo): void {
  response.headers.set('X-RateLimit-Limit', info.limit.toString());
  response.headers.set('X-RateLimit-Remaining', info.remaining.toString());
  response.headers.set('X-RateLimit-Reset', Math.ceil(info.resetTime / 1000).toString());
  response.headers.set('X-RateLimit-Used', (info.limit - info.remaining).toString());
}

/**
 * Predefined rate limit configurations
 */
export const RateLimitPresets = {
  strict: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100
  },
  moderate: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 300
  },
  lenient: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000
  },
  authEndpoints: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5 // Very strict for auth
  },
  searchEndpoints: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 30
  },
  uploadEndpoints: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10
  }
};

/**
 * Rate limiting middleware with strict limits
 */
export function withStrictRateLimit<THandler extends (request: NextRequest, ...args: any[]) => Promise<NextResponse>>(
  handler: THandler
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  return withRateLimit(handler, RateLimitPresets.strict);
}

/**
 * Rate limiting middleware with moderate limits
 */
export function withModerateRateLimit<THandler extends (request: NextRequest, ...args: any[]) => Promise<NextResponse>>(
  handler: THandler
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  return withRateLimit(handler, RateLimitPresets.moderate);
}

/**
 * Rate limiting middleware with lenient limits
 */
export function withLenientRateLimit<THandler extends (request: NextRequest, ...args: any[]) => Promise<NextResponse>>(
  handler: THandler
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  return withRateLimit(handler, RateLimitPresets.lenient);
}

/**
 * Rate limiting for authentication endpoints
 */
export function withAuthRateLimit<THandler extends (request: NextRequest, ...args: any[]) => Promise<NextResponse>>(
  handler: THandler
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  return withRateLimit(handler, {
    ...RateLimitPresets.authEndpoints,
    message: 'Too many authentication attempts',
    keyGenerator: (request) => {
      // Use more specific key for auth endpoints
      const ip = getClientIP(request);
      return `auth:${ip}`;
    }
  });
}

/**
 * Rate limiting for search endpoints
 */
export function withSearchRateLimit<THandler extends (request: NextRequest, ...args: any[]) => Promise<NextResponse>>(
  handler: THandler
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  return withRateLimit(handler, {
    ...RateLimitPresets.searchEndpoints,
    message: 'Too many search requests'
  });
}

/**
 * Rate limiting for upload endpoints
 */
export function withUploadRateLimit<THandler extends (request: NextRequest, ...args: any[]) => Promise<NextResponse>>(
  handler: THandler
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  return withRateLimit(handler, {
    ...RateLimitPresets.uploadEndpoints,
    message: 'Too many upload requests'
  });
}

/**
 * User-specific rate limiting
 */
export function withUserRateLimit<THandler extends (request: NextRequest, ...args: any[]) => Promise<NextResponse>>(
  handler: THandler,
  config: Omit<RateLimitConfig, 'keyGenerator'>
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  return withRateLimit(handler, {
    ...config,
    keyGenerator: (request) => {
      const userId = (request as any).userId;
      const pathname = new URL(request.url).pathname;
      return userId ? `user:${userId}:${pathname}` : defaultKeyGenerator(request);
    }
  });
}

/**
 * API key specific rate limiting
 */
export function withApiKeyRateLimit<THandler extends (request: NextRequest, ...args: any[]) => Promise<NextResponse>>(
  handler: THandler,
  config: Omit<RateLimitConfig, 'keyGenerator'>
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  return withRateLimit(handler, {
    ...config,
    keyGenerator: (request) => {
      const apiKey = request.headers.get('x-api-key') || new URL(request.url).searchParams.get('api_key');
      const pathname = new URL(request.url).pathname;
      return apiKey ? `apikey:${apiKey}:${pathname}` : defaultKeyGenerator(request);
    }
  });
}

/**
 * Higher-order function for creating rate limiting middleware with custom options
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return function <THandler extends (request: NextRequest, ...args: any[]) => Promise<NextResponse>>(
    handler: THandler
  ): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
    return withRateLimit(handler, config);
  };
}