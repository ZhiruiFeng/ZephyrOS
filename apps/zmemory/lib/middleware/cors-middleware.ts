import { NextRequest, NextResponse } from 'next/server';
import { jsonWithCors, createOptionsResponse, getAllowedOrigins } from '@/lib/utils/security';

export interface CorsMiddlewareOptions {
  allowedOrigins?: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  exposeHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
  customOptionsHandler?: (request: NextRequest) => NextResponse;
}

/**
 * CORS middleware that wraps handlers to provide consistent CORS support
 */
export function withCors<THandler extends (request: NextRequest, ...args: any[]) => Promise<NextResponse>>(
  handler: THandler,
  options: CorsMiddlewareOptions = {}
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    try {
      // Handle preflight OPTIONS requests
      if (request.method === 'OPTIONS') {
        if (options.customOptionsHandler) {
          return options.customOptionsHandler(request);
        }
        return createOptionsResponse(request);
      }

      // Call the actual handler
      const response = await handler(request, ...args);

      // Apply CORS headers to the response
      return applyCorsHeaders(request, response, options);
    } catch (error) {
      // Even error responses need CORS headers
      console.error('CORS middleware error:', error);
      const errorResponse = jsonWithCors(request, { error: 'Internal server error' }, 500);
      return applyCorsHeaders(request, errorResponse, options);
    }
  };
}

/**
 * Apply CORS headers to an existing response
 */
export function applyCorsHeaders(
  request: NextRequest,
  response: NextResponse,
  options: CorsMiddlewareOptions = {}
): NextResponse {
  const {
    allowedOrigins = getAllowedOrigins(),
    allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders = [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-API-Key'
    ],
    exposeHeaders = [],
    credentials = true,
    maxAge = 86400 // 24 hours
  } = options;

  const origin = request.headers.get('origin');
  const requestedHeaders = request.headers.get('access-control-request-headers');
  const hasAuthHeader = !!(request.headers.get('authorization') || request.headers.get('Authorization'));
  const requestedHasAuth = requestedHeaders?.toLowerCase().includes('authorization') ?? false;
  const hasAuth = hasAuthHeader || requestedHasAuth;

  const normalizedAllowedOrigins = Array.isArray(allowedOrigins) ? allowedOrigins : [allowedOrigins];
  let allowOrigin = '*';

  if (
    origin && (
      normalizedAllowedOrigins.includes(origin) ||
      (!options.allowedOrigins && origin.endsWith('.vercel.app')) ||
      hasAuth
    )
  ) {
    allowOrigin = origin;
  }

  if (allowOrigin === '*') {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.delete('Access-Control-Allow-Credentials');
  } else {
    response.headers.set('Access-Control-Allow-Origin', allowOrigin);

    if (credentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    } else {
      response.headers.delete('Access-Control-Allow-Credentials');
    }

    response.headers.append('Vary', 'Origin');
    response.headers.append('Vary', 'Access-Control-Request-Headers');
  }

  // Set CORS headers on the response
  // Note: The origin validation is already handled in jsonWithCors and createOptionsResponse
  // We're just ensuring consistency here

  response.headers.set('Access-Control-Allow-Methods', allowedMethods.join(', '));

  if (requestedHeaders) {
    response.headers.set('Access-Control-Allow-Headers', requestedHeaders);
  } else {
    response.headers.set('Access-Control-Allow-Headers', allowedHeaders.join(', '));
  }

  if (exposeHeaders.length > 0) {
    response.headers.set('Access-Control-Expose-Headers', exposeHeaders.join(', '));
  }

  if (credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  response.headers.set('Access-Control-Max-Age', maxAge.toString());

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

/**
 * Higher-order function for creating CORS middleware with custom options
 */
export function createCorsMiddleware(options: CorsMiddlewareOptions) {
  return function <THandler extends (request: NextRequest, ...args: any[]) => Promise<NextResponse>>(
    handler: THandler
  ): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
    return withCors(handler, options);
  };
}

/**
 * Middleware specifically for API routes with standard CORS configuration
 */
export function withApiCors<THandler extends (request: NextRequest, ...args: any[]) => Promise<NextResponse>>(
  handler: THandler
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  return withCors(handler, {
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-API-Key',
      'X-Client-Version',
      'X-Request-ID'
    ],
    exposeHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
    credentials: true,
    maxAge: 86400
  });
}

/**
 * Middleware for public API endpoints with more permissive CORS
 */
export function withPublicCors<THandler extends (request: NextRequest, ...args: any[]) => Promise<NextResponse>>(
  handler: THandler
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  return withCors(handler, {
    allowedMethods: ['GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Origin'],
    credentials: false,
    maxAge: 3600 // 1 hour
  });
}

/**
 * JSON response helper with CORS that uses existing security utility
 */
export function createCorsResponse(
  request: NextRequest,
  body: any,
  status: number = 200,
  options: CorsMiddlewareOptions = {}
): NextResponse {
  // Use the existing jsonWithCors utility which already handles CORS properly
  const response = jsonWithCors(request, body, status);
  return applyCorsHeaders(request, response, options);
}

/**
 * Standard OPTIONS handler that can be used across all routes
 */
export function createStandardOptionsHandler(options: CorsMiddlewareOptions = {}) {
  return (request: NextRequest): NextResponse => {
    // Use the existing createOptionsResponse utility
    const response = createOptionsResponse(request);
    return applyCorsHeaders(request, response, options);
  };
}

/**
 * Compose multiple CORS middlewares (useful for complex routing scenarios)
 */
export function composeCorsMiddleware<THandler extends (request: NextRequest, ...args: any[]) => Promise<NextResponse>>(
  handler: THandler,
  ...middlewares: Array<(handler: THandler) => (request: NextRequest, ...args: any[]) => Promise<NextResponse>>
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  return middlewares.reduce((wrappedHandler, middleware) => {
    return middleware(wrappedHandler as THandler) as any;
  }, handler as any);
}
