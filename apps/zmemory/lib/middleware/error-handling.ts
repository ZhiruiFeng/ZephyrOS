import { NextRequest, NextResponse } from 'next/server';
import { jsonWithCors, sanitizeErrorMessage } from '@/lib/utils/security';
import { ZodError } from 'zod';

export interface ErrorHandlingOptions {
  logErrors?: boolean;
  includeStackTrace?: boolean;
  customErrorHandler?: (error: Error, request: NextRequest) => NextResponse | null;
  errorTypes?: {
    [errorName: string]: {
      statusCode: number;
      message?: string;
      includeDetails?: boolean;
    };
  };
}

export interface ErrorContext {
  request: NextRequest;
  handler: string;
  timestamp: string;
  userId?: string;
}

/**
 * Error handling middleware that provides consistent error responses
 */
export function withErrorHandling<THandler extends (request: NextRequest, ...args: any[]) => Promise<NextResponse>>(
  handler: THandler,
  options: ErrorHandlingOptions = {}
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  const {
    logErrors = true,
    includeStackTrace = process.env.NODE_ENV === 'development',
    customErrorHandler,
    errorTypes = {}
  } = options;

  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      const context: ErrorContext = {
        request,
        handler: handler.name || 'anonymous',
        timestamp: new Date().toISOString(),
        userId: (request as any).userId
      };

      return handleError(error, context, options);
    }
  };
}

/**
 * Handle different types of errors with appropriate responses
 */
export function handleError(
  error: unknown,
  context: ErrorContext,
  options: ErrorHandlingOptions = {}
): NextResponse {
  const {
    logErrors = true,
    includeStackTrace = process.env.NODE_ENV === 'development',
    customErrorHandler,
    errorTypes = {}
  } = options;

  const err = error instanceof Error ? error : new Error(String(error));

  // Log the error if enabled
  if (logErrors) {
    logError(err, context);
  }

  // Try custom error handler first
  if (customErrorHandler) {
    const customResponse = customErrorHandler(err, context.request);
    if (customResponse) {
      return customResponse;
    }
  }

  // Handle specific error types
  const errorResponse = handleSpecificErrors(err, context.request, errorTypes);
  if (errorResponse) {
    return errorResponse;
  }

  // Default error response
  const sanitizedMessage = sanitizeErrorMessage(err);
  const responseBody: any = {
    error: sanitizedMessage,
    timestamp: context.timestamp
  };

  if (includeStackTrace && err.stack) {
    responseBody.stack = err.stack;
  }

  return jsonWithCors(context.request, responseBody, 500);
}

/**
 * Handle specific error types with custom responses
 */
function handleSpecificErrors(
  error: Error,
  request: NextRequest,
  errorTypes: ErrorHandlingOptions['errorTypes'] = {}
): NextResponse | null {
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return jsonWithCors(request, {
      error: 'Validation failed',
      details: error.errors
    }, 400);
  }

  // Handle database errors
  if (error.message.includes('duplicate key value') || error.message.includes('violates unique constraint')) {
    return jsonWithCors(request, {
      error: 'Resource already exists'
    }, 409);
  }

  if (error.message.includes('foreign key constraint')) {
    return jsonWithCors(request, {
      error: 'Invalid reference to related resource'
    }, 400);
  }

  // Handle custom error types
  const errorName = error.constructor.name;
  if (errorTypes[errorName]) {
    const config = errorTypes[errorName];
    const responseBody: any = {
      error: config.message || error.message
    };

    if (config.includeDetails) {
      responseBody.details = error.message;
    }

    return jsonWithCors(request, responseBody, config.statusCode);
  }

  // Handle common HTTP-like errors
  if (error.message.includes('Not found') || error.message.includes('not found')) {
    return jsonWithCors(request, { error: 'Resource not found' }, 404);
  }

  if (error.message.includes('Unauthorized') || error.message.includes('unauthorized')) {
    return jsonWithCors(request, { error: 'Unauthorized' }, 401);
  }

  if (error.message.includes('Forbidden') || error.message.includes('forbidden')) {
    return jsonWithCors(request, { error: 'Forbidden' }, 403);
  }

  if (error.message.includes('Too many requests') || error.message.includes('rate limit')) {
    return jsonWithCors(request, { error: 'Too many requests' }, 429);
  }

  return null;
}

/**
 * Log error with context information
 */
function logError(error: Error, context: ErrorContext): void {
  const logData = {
    message: error.message,
    stack: error.stack,
    context: {
      handler: context.handler,
      timestamp: context.timestamp,
      userId: context.userId,
      method: context.request.method,
      url: context.request.url,
      userAgent: context.request.headers.get('user-agent'),
      origin: context.request.headers.get('origin')
    }
  };

  console.error('[API Error]', logData);

  // In production, you might want to send to external logging service
  if (process.env.NODE_ENV === 'production' && process.env.ERROR_REPORTING_URL) {
    // Send to external service (implement as needed)
    // fetch(process.env.ERROR_REPORTING_URL, { method: 'POST', body: JSON.stringify(logData) })
  }
}

/**
 * Higher-order function for creating error handling middleware with custom options
 */
export function createErrorHandler(options: ErrorHandlingOptions) {
  return function <THandler extends (request: NextRequest, ...args: any[]) => Promise<NextResponse>>(
    handler: THandler
  ): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
    return withErrorHandling(handler, options);
  };
}

/**
 * Development error handler with detailed error information
 */
export function withDevErrorHandling<THandler extends (request: NextRequest, ...args: any[]) => Promise<NextResponse>>(
  handler: THandler
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  return withErrorHandling(handler, {
    logErrors: true,
    includeStackTrace: true,
    errorTypes: {
      ValidationError: { statusCode: 400, includeDetails: true },
      AuthenticationError: { statusCode: 401, message: 'Authentication required' },
      AuthorizationError: { statusCode: 403, message: 'Insufficient permissions' },
      NotFoundError: { statusCode: 404, message: 'Resource not found' },
      ConflictError: { statusCode: 409, includeDetails: true },
      RateLimitError: { statusCode: 429, message: 'Too many requests' }
    }
  });
}

/**
 * Production error handler with minimal error exposure
 */
export function withProdErrorHandling<THandler extends (request: NextRequest, ...args: any[]) => Promise<NextResponse>>(
  handler: THandler
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  return withErrorHandling(handler, {
    logErrors: true,
    includeStackTrace: false,
    errorTypes: {
      ValidationError: { statusCode: 400, message: 'Invalid input' },
      AuthenticationError: { statusCode: 401, message: 'Authentication required' },
      AuthorizationError: { statusCode: 403, message: 'Access denied' },
      NotFoundError: { statusCode: 404, message: 'Not found' },
      ConflictError: { statusCode: 409, message: 'Conflict' },
      RateLimitError: { statusCode: 429, message: 'Too many requests' }
    }
  });
}

/**
 * Async error boundary for wrapping async operations
 */
export async function asyncErrorBoundary<T>(
  operation: () => Promise<T>,
  fallback?: () => T | Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error('Async operation failed:', error);
    if (fallback) {
      return await fallback();
    }
    throw error;
  }
}

/**
 * Custom error classes for better error handling
 */
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends APIError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends APIError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends APIError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends APIError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class RateLimitError extends APIError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}