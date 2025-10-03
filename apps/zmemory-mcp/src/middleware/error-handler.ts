/**
 * Error Handling Middleware
 *
 * Centralized error handling for MCP tool calls
 */

import {
  ZMemoryMCPError,
  isZMemoryError,
  normalizeError,
  isOperationalError,
  ErrorContext,
} from '../errors/index.js';

/**
 * Error handler options
 */
export interface ErrorHandlerOptions {
  /**
   * Include stack trace in error response (only in development)
   */
  includeStackTrace?: boolean;

  /**
   * Log errors to console
   */
  logErrors?: boolean;

  /**
   * Custom error logger function
   */
  logger?: (error: ZMemoryMCPError) => void;

  /**
   * Transform error before returning
   */
  transformError?: (error: ZMemoryMCPError) => any;
}

/**
 * Default error handler options
 */
const DEFAULT_OPTIONS: ErrorHandlerOptions = {
  includeStackTrace: process.env.NODE_ENV === 'development',
  logErrors: true,
};

/**
 * Error handler class for MCP tools
 */
export class ErrorHandler {
  private options: ErrorHandlerOptions;

  constructor(options: ErrorHandlerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Handle an error and return formatted response
   */
  handle(error: any, context?: ErrorContext): any {
    const zmemoryError = normalizeError(error, context);

    // Log error if enabled
    if (this.options.logErrors) {
      this.logError(zmemoryError);
    }

    // Transform error if custom transformer provided
    if (this.options.transformError) {
      return this.options.transformError(zmemoryError);
    }

    // Return formatted error response
    return this.formatErrorResponse(zmemoryError);
  }

  /**
   * Log error to console or custom logger
   */
  private logError(error: ZMemoryMCPError): void {
    if (this.options.logger) {
      this.options.logger(error);
      return;
    }

    // Default console logging
    const logData = {
      timestamp: error.timestamp,
      error: error.name,
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      context: error.context,
      isOperational: error.isOperational,
    };

    if (error.isOperational) {
      console.warn('[Operational Error]', JSON.stringify(logData, null, 2));
    } else {
      console.error('[Programming Error]', JSON.stringify(logData, null, 2));
      if (this.options.includeStackTrace && error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
  }

  /**
   * Format error response for MCP protocol
   */
  private formatErrorResponse(error: ZMemoryMCPError): any {
    const response: any = {
      content: [
        {
          type: 'text',
          text: `❌ 错误: ${error.message}`,
        },
      ],
      isError: true,
    };

    // Add error details in development mode
    if (this.options.includeStackTrace) {
      response.content.push({
        type: 'text',
        text: `\n错误详情:\n${JSON.stringify(error.toJSON(), null, 2)}`,
      });
    }

    // Add retry information if applicable
    if (error instanceof ZMemoryMCPError && 'retryAfter' in error) {
      const retryAfter = (error as any).retryAfter;
      if (retryAfter) {
        response.content.push({
          type: 'text',
          text: `\n请在 ${retryAfter} 秒后重试。`,
        });
      }
    }

    return response;
  }

  /**
   * Wrap an async function with error handling
   */
  wrap<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context?: ErrorContext
  ): T {
    return (async (...args: any[]) => {
      try {
        return await fn(...args);
      } catch (error) {
        return this.handle(error, context);
      }
    }) as T;
  }

  /**
   * Create a decorator for error handling
   */
  static decorator(options: ErrorHandlerOptions = {}) {
    const handler = new ErrorHandler(options);

    return function (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ) {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          const context: ErrorContext = {
            tool_name: propertyKey,
            timestamp: new Date().toISOString(),
          };
          return handler.handle(error, context);
        }
      };

      return descriptor;
    };
  }
}

/**
 * Global error handler instance
 */
export const globalErrorHandler = new ErrorHandler();

/**
 * HandleError decorator for automatic error handling
 */
export function HandleError(options: ErrorHandlerOptions = {}) {
  return ErrorHandler.decorator(options);
}

/**
 * Safely execute a function with error handling
 */
export async function safeExecute<T>(
  fn: () => Promise<T>,
  context?: ErrorContext,
  options?: ErrorHandlerOptions
): Promise<T | any> {
  const handler = new ErrorHandler(options);

  try {
    return await fn();
  } catch (error) {
    return handler.handle(error, context);
  }
}

/**
 * Create error response for MCP tools
 */
export function createErrorResponse(
  error: any,
  context?: ErrorContext
): any {
  return globalErrorHandler.handle(error, context);
}

/**
 * Check if a response is an error response
 */
export function isErrorResponse(response: any): boolean {
  return response?.isError === true;
}

/**
 * Extract error from error response
 */
export function extractError(response: any): ZMemoryMCPError | null {
  if (!isErrorResponse(response)) {
    return null;
  }

  // Try to reconstruct error from response
  const errorText = response.content?.[0]?.text;
  if (!errorText) {
    return null;
  }

  // This is a simplified extraction - in production you might want to
  // serialize more error information in the response
  return normalizeError(new Error(errorText));
}
