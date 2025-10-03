/**
 * Standardized Error Classes for ZMemory MCP Server
 *
 * Provides a hierarchy of error classes with rich context for better debugging
 */

import { ErrorCode, ErrorCodes, ErrorMessages, ErrorStatusCodes } from './error-codes.js';

/**
 * Error context interface
 */
export interface ErrorContext {
  user_id?: string;
  request_id?: string;
  timestamp?: string;
  tool_name?: string;
  resource_id?: string;
  resource_type?: string;
  retry_after?: number;
  [key: string]: any;
}

/**
 * Base error class for all ZMemory MCP errors
 */
export class ZMemoryMCPError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly context?: ErrorContext;
  public readonly isOperational: boolean;
  public readonly timestamp: string;

  constructor(
    code: ErrorCode,
    message?: string,
    statusCode?: number,
    context?: ErrorContext,
    isOperational: boolean = true
  ) {
    const errorMessage = message || ErrorMessages[code] || 'An error occurred';
    super(errorMessage);

    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode || ErrorStatusCodes[code] || 500;
    this.context = context;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON format
   */
  toJSON() {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      context: this.context,
      ...(process.env.NODE_ENV === 'development' && {
        stack: this.stack,
      }),
    };
  }

  /**
   * Convert error to user-friendly message
   */
  toUserMessage(): string {
    return this.message;
  }
}

/**
 * Authentication related errors
 */
export class AuthenticationError extends ZMemoryMCPError {
  constructor(
    code: ErrorCode = ErrorCodes.AUTH_REQUIRED,
    message?: string,
    context?: ErrorContext
  ) {
    super(code, message, ErrorStatusCodes[code], context);
  }
}

/**
 * Validation related errors
 */
export class ValidationError extends ZMemoryMCPError {
  public readonly field?: string;
  public readonly value?: any;

  constructor(
    message?: string,
    field?: string,
    value?: any,
    context?: ErrorContext
  ) {
    const code = ErrorCodes.VALIDATION_FAILED;
    super(
      code,
      message,
      ErrorStatusCodes[code],
      {
        ...context,
        field,
        value: value !== undefined ? String(value) : undefined,
      }
    );
    this.field = field;
    this.value = value;
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends ZMemoryMCPError {
  constructor(
    resourceType: string,
    resourceId?: string,
    message?: string,
    context?: ErrorContext
  ) {
    const code = ErrorCodes.RESOURCE_NOT_FOUND;
    const defaultMessage = resourceId
      ? `${resourceType} with ID '${resourceId}' not found`
      : `${resourceType} not found`;

    super(
      code,
      message || defaultMessage,
      ErrorStatusCodes[code],
      {
        ...context,
        resource_type: resourceType,
        resource_id: resourceId,
      }
    );
  }
}

/**
 * Resource conflict errors (e.g., duplicate resource)
 */
export class ConflictError extends ZMemoryMCPError {
  constructor(
    message: string,
    resourceType?: string,
    context?: ErrorContext
  ) {
    const code = ErrorCodes.RESOURCE_CONFLICT;
    super(
      code,
      message,
      ErrorStatusCodes[code],
      {
        ...context,
        resource_type: resourceType,
      }
    );
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends ZMemoryMCPError {
  public readonly retryAfter?: number;

  constructor(
    message?: string,
    retryAfter?: number,
    context?: ErrorContext
  ) {
    const code = ErrorCodes.RATE_LIMIT_EXCEEDED;
    super(
      code,
      message,
      ErrorStatusCodes[code],
      {
        ...context,
        retry_after: retryAfter,
      }
    );
    this.retryAfter = retryAfter;
  }
}

/**
 * Network related errors
 */
export class NetworkError extends ZMemoryMCPError {
  constructor(
    code: ErrorCode = ErrorCodes.NETWORK_ERROR,
    message?: string,
    context?: ErrorContext
  ) {
    super(code, message, ErrorStatusCodes[code], context);
  }
}

/**
 * Tool execution errors
 */
export class ToolExecutionError extends ZMemoryMCPError {
  public readonly toolName?: string;

  constructor(
    message: string,
    toolName?: string,
    code: ErrorCode = ErrorCodes.TOOL_EXECUTION_FAILED,
    context?: ErrorContext
  ) {
    super(
      code,
      message,
      ErrorStatusCodes[code],
      {
        ...context,
        tool_name: toolName,
      }
    );
    this.toolName = toolName;
  }
}

/**
 * Internal server errors
 */
export class InternalError extends ZMemoryMCPError {
  constructor(
    message: string = 'Internal server error',
    context?: ErrorContext,
    isOperational: boolean = false
  ) {
    const code = ErrorCodes.INTERNAL_ERROR;
    super(
      code,
      message,
      ErrorStatusCodes[code],
      context,
      isOperational
    );
  }
}

/**
 * Service unavailable errors
 */
export class ServiceUnavailableError extends ZMemoryMCPError {
  public readonly retryAfter?: number;

  constructor(
    message?: string,
    retryAfter?: number,
    context?: ErrorContext
  ) {
    const code = ErrorCodes.SERVICE_UNAVAILABLE;
    super(
      code,
      message,
      ErrorStatusCodes[code],
      {
        ...context,
        retry_after: retryAfter,
      }
    );
    this.retryAfter = retryAfter;
  }
}

/**
 * Check if error is a ZMemory MCP error
 */
export function isZMemoryError(error: any): error is ZMemoryMCPError {
  return error instanceof ZMemoryMCPError;
}

/**
 * Check if error is operational (expected) vs programming error
 */
export function isOperationalError(error: any): boolean {
  if (isZMemoryError(error)) {
    return error.isOperational;
  }
  return false;
}

/**
 * Convert any error to ZMemoryMCPError
 */
export function normalizeError(error: any, context?: ErrorContext): ZMemoryMCPError {
  // Already a ZMemory error
  if (isZMemoryError(error)) {
    return error;
  }

  // Axios error
  if (error.isAxiosError) {
    if (error.response) {
      const status = error.response.status;

      if (status === 401 || status === 403) {
        return new AuthenticationError(
          ErrorCodes.AUTH_TOKEN_INVALID,
          error.message,
          context
        );
      }

      if (status === 404) {
        return new NotFoundError(
          'Resource',
          undefined,
          error.message,
          context
        );
      }

      if (status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        return new RateLimitError(
          error.message,
          retryAfter ? parseInt(retryAfter) : undefined,
          context
        );
      }

      if (status >= 500) {
        return new ServiceUnavailableError(
          error.message,
          undefined,
          context
        );
      }
    }

    // Network error without response
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new NetworkError(
        ErrorCodes.NETWORK_TIMEOUT,
        error.message,
        context
      );
    }

    return new NetworkError(
      ErrorCodes.NETWORK_ERROR,
      error.message,
      context
    );
  }

  // Zod validation error
  if (error.name === 'ZodError') {
    const firstIssue = error.issues?.[0];
    return new ValidationError(
      firstIssue?.message || 'Validation failed',
      firstIssue?.path?.join('.'),
      undefined,
      {
        ...context,
        validation_issues: error.issues,
      }
    );
  }

  // Generic error
  return new InternalError(
    error.message || 'Unknown error occurred',
    {
      ...context,
      original_error: error.toString(),
    },
    false // Not operational since it's unexpected
  );
}

// Export error codes and utilities
export { ErrorCode, ErrorCodes, ErrorMessages, ErrorStatusCodes } from './error-codes.js';
export { isRetryableError, getRetryDelay } from './error-codes.js';
