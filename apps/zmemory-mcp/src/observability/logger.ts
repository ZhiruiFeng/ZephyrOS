/**
 * Structured Logging with Pino
 *
 * Provides centralized logging with PII redaction and structured output
 */

import pino from 'pino';

/**
 * Log levels
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level?: LogLevel;
  pretty?: boolean;
  redactPaths?: string[];
}

/**
 * Create Pino logger instance
 */
function createLogger(config: LoggerConfig = {}): pino.Logger {
  const {
    level = (process.env.LOG_LEVEL as LogLevel) || 'info',
    pretty = process.env.NODE_ENV === 'development',
    redactPaths = [],
  } = config;

  const pinoConfig: pino.LoggerOptions = {
    level,
    formatters: {
      level: (label) => ({ level: label }),
      bindings: (bindings) => ({
        pid: bindings.pid,
        hostname: bindings.hostname,
        service: 'zmemory-mcp',
      }),
    },
    redact: {
      paths: [
        // Authentication tokens
        '*.access_token',
        '*.refresh_token',
        '*.accessToken',
        '*.refreshToken',
        '*.token',
        '*.api_key',
        '*.apiKey',
        'req.headers.authorization',
        'req.headers.cookie',

        // Passwords and secrets
        '*.password',
        '*.secret',
        '*.client_secret',
        '*.clientSecret',

        // Personal data
        '*.email',
        '*.phone',
        '*.ssn',
        '*.credit_card',

        // Custom redaction paths
        ...redactPaths,
      ],
      censor: '[REDACTED]',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
      service: 'zmemory-mcp',
      version: process.env.npm_package_version || '1.0.0',
      env: process.env.NODE_ENV || 'development',
    },
  };

  // Add pretty printing for development
  if (pretty) {
    return pino({
      ...pinoConfig,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    });
  }

  return pino(pinoConfig);
}

/**
 * Global logger instance
 */
export const logger = createLogger();

/**
 * Create child logger with additional context
 */
export function createChildLogger(context: Record<string, any>): pino.Logger {
  return logger.child(context);
}

/**
 * Log context interface
 */
export interface LogContext {
  user_id?: string;
  request_id?: string;
  tool_name?: string;
  duration_ms?: number;
  [key: string]: any;
}

/**
 * Logger class with convenience methods
 */
export class Logger {
  private logger: pino.Logger;

  constructor(context?: Record<string, any>) {
    this.logger = context ? createChildLogger(context) : logger;
  }

  trace(message: string, context?: LogContext): void {
    this.logger.trace(context, message);
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(context, message);
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(context, message);
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(context, message);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.logger.error(
      {
        ...context,
        err: error ? this.serializeError(error) : undefined,
      },
      message
    );
  }

  fatal(message: string, error?: Error, context?: LogContext): void {
    this.logger.fatal(
      {
        ...context,
        err: error ? this.serializeError(error) : undefined,
      },
      message
    );
  }

  /**
   * Log tool execution start
   */
  toolStart(toolName: string, args?: any, context?: LogContext): void {
    this.info('Tool execution started', {
      ...context,
      tool_name: toolName,
      args: this.sanitizeArgs(args),
    });
  }

  /**
   * Log tool execution success
   */
  toolSuccess(
    toolName: string,
    durationMs: number,
    context?: LogContext
  ): void {
    this.info('Tool execution succeeded', {
      ...context,
      tool_name: toolName,
      duration_ms: durationMs,
      success: true,
    });
  }

  /**
   * Log tool execution failure
   */
  toolError(
    toolName: string,
    error: Error,
    durationMs: number,
    context?: LogContext
  ): void {
    this.error('Tool execution failed', error, {
      ...context,
      tool_name: toolName,
      duration_ms: durationMs,
      success: false,
    });
  }

  /**
   * Log API request
   */
  apiRequest(method: string, url: string, context?: LogContext): void {
    this.info('API request', {
      ...context,
      http_method: method,
      url,
      type: 'api_request',
    });
  }

  /**
   * Log API response
   */
  apiResponse(
    method: string,
    url: string,
    statusCode: number,
    durationMs: number,
    context?: LogContext
  ): void {
    const logContext = {
      ...context,
      http_method: method,
      url,
      status_code: statusCode,
      duration_ms: durationMs,
      type: 'api_response',
    };

    if (statusCode >= 500) {
      this.error('API response', undefined, logContext);
    } else if (statusCode >= 400) {
      this.warn('API response', logContext);
    } else {
      this.info('API response', logContext);
    }
  }

  /**
   * Log authentication event
   */
  authEvent(event: string, success: boolean, context?: LogContext): void {
    const logContext = {
      ...context,
      auth_event: event,
      success,
      type: 'auth',
    };

    if (success) {
      this.info('Authentication event', logContext);
    } else {
      this.warn('Authentication event', logContext);
    }
  }

  /**
   * Serialize error for logging
   */
  private serializeError(error: Error): any {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
      ...(error as any),
    };
  }

  /**
   * Sanitize arguments to remove sensitive data
   */
  private sanitizeArgs(args?: any): any {
    if (!args) return undefined;

    // Create shallow copy
    const sanitized = { ...args };

    // Redact sensitive fields
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'api_key',
      'access_token',
      'refresh_token',
    ];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Create child logger with additional context
   */
  child(context: Record<string, any>): Logger {
    const childLogger = new Logger();
    childLogger.logger = this.logger.child(context);
    return childLogger;
  }
}

/**
 * Default logger instance
 */
export const defaultLogger = new Logger();

/**
 * Create request logger with request ID
 */
export function createRequestLogger(requestId: string): Logger {
  return new Logger({ request_id: requestId });
}

/**
 * Create tool logger with tool name
 */
export function createToolLogger(toolName: string): Logger {
  return new Logger({ tool_name: toolName });
}

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
