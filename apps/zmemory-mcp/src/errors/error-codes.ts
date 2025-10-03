/**
 * Error Codes for ZMemory MCP Server
 *
 * Standardized error codes for better debugging and i18n support
 */

export const ErrorCodes = {
  // Authentication Errors (1xxx)
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_MISSING: 'AUTH_TOKEN_MISSING',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_REFRESH_FAILED: 'AUTH_REFRESH_FAILED',
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_PERMISSION_DENIED: 'AUTH_PERMISSION_DENIED',

  // Validation Errors (2xxx)
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  VALIDATION_MISSING_FIELD: 'VALIDATION_MISSING_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  VALIDATION_OUT_OF_RANGE: 'VALIDATION_OUT_OF_RANGE',
  VALIDATION_INVALID_TYPE: 'VALIDATION_INVALID_TYPE',

  // Resource Errors (3xxx)
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  RESOURCE_GONE: 'RESOURCE_GONE',

  // Network Errors (4xxx)
  NETWORK_ERROR: 'NETWORK_ERROR',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  NETWORK_CONNECTION_FAILED: 'NETWORK_CONNECTION_FAILED',
  NETWORK_DNS_FAILED: 'NETWORK_DNS_FAILED',

  // Rate Limiting Errors (5xxx)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  THROTTLED: 'THROTTLED',

  // Server Errors (6xxx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',

  // Tool Execution Errors (7xxx)
  TOOL_EXECUTION_FAILED: 'TOOL_EXECUTION_FAILED',
  TOOL_NOT_FOUND: 'TOOL_NOT_FOUND',
  TOOL_INVALID_ARGS: 'TOOL_INVALID_ARGS',
  TOOL_TIMEOUT: 'TOOL_TIMEOUT',

  // Client Errors (8xxx)
  CLIENT_ERROR: 'CLIENT_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  UNSUPPORTED_OPERATION: 'UNSUPPORTED_OPERATION',

  // Cache Errors (9xxx)
  CACHE_ERROR: 'CACHE_ERROR',
  CACHE_MISS: 'CACHE_MISS',
  CACHE_EXPIRED: 'CACHE_EXPIRED',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Error messages in English (can be extended for i18n)
 */
export const ErrorMessages: Record<ErrorCode, string> = {
  // Authentication
  [ErrorCodes.AUTH_TOKEN_EXPIRED]: 'Access token has expired. Please refresh your token.',
  [ErrorCodes.AUTH_TOKEN_INVALID]: 'Access token is invalid or malformed.',
  [ErrorCodes.AUTH_TOKEN_MISSING]: 'Access token is missing. Please authenticate first.',
  [ErrorCodes.AUTH_REQUIRED]: 'Authentication is required to access this resource.',
  [ErrorCodes.AUTH_REFRESH_FAILED]: 'Failed to refresh access token.',
  [ErrorCodes.AUTH_INVALID_CREDENTIALS]: 'Invalid credentials provided.',
  [ErrorCodes.AUTH_PERMISSION_DENIED]: 'You do not have permission to perform this action.',

  // Validation
  [ErrorCodes.VALIDATION_FAILED]: 'Input validation failed.',
  [ErrorCodes.VALIDATION_MISSING_FIELD]: 'Required field is missing.',
  [ErrorCodes.VALIDATION_INVALID_FORMAT]: 'Field format is invalid.',
  [ErrorCodes.VALIDATION_OUT_OF_RANGE]: 'Value is out of acceptable range.',
  [ErrorCodes.VALIDATION_INVALID_TYPE]: 'Field type is invalid.',

  // Resource
  [ErrorCodes.RESOURCE_NOT_FOUND]: 'Requested resource not found.',
  [ErrorCodes.RESOURCE_ALREADY_EXISTS]: 'Resource already exists.',
  [ErrorCodes.RESOURCE_CONFLICT]: 'Resource conflict detected.',
  [ErrorCodes.RESOURCE_GONE]: 'Resource is no longer available.',

  // Network
  [ErrorCodes.NETWORK_ERROR]: 'Network error occurred.',
  [ErrorCodes.NETWORK_TIMEOUT]: 'Network request timed out.',
  [ErrorCodes.NETWORK_CONNECTION_FAILED]: 'Failed to establish network connection.',
  [ErrorCodes.NETWORK_DNS_FAILED]: 'DNS resolution failed.',

  // Rate Limiting
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded. Please try again later.',
  [ErrorCodes.QUOTA_EXCEEDED]: 'Quota exceeded.',
  [ErrorCodes.THROTTLED]: 'Request throttled due to high load.',

  // Server
  [ErrorCodes.INTERNAL_ERROR]: 'Internal server error occurred.',
  [ErrorCodes.SERVICE_UNAVAILABLE]: 'Service is temporarily unavailable.',
  [ErrorCodes.DATABASE_ERROR]: 'Database operation failed.',
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]: 'External service error occurred.',

  // Tool Execution
  [ErrorCodes.TOOL_EXECUTION_FAILED]: 'Tool execution failed.',
  [ErrorCodes.TOOL_NOT_FOUND]: 'Tool not found.',
  [ErrorCodes.TOOL_INVALID_ARGS]: 'Invalid tool arguments provided.',
  [ErrorCodes.TOOL_TIMEOUT]: 'Tool execution timed out.',

  // Client
  [ErrorCodes.CLIENT_ERROR]: 'Client error occurred.',
  [ErrorCodes.BAD_REQUEST]: 'Bad request.',
  [ErrorCodes.UNSUPPORTED_OPERATION]: 'Operation not supported.',

  // Cache
  [ErrorCodes.CACHE_ERROR]: 'Cache operation failed.',
  [ErrorCodes.CACHE_MISS]: 'Cache miss.',
  [ErrorCodes.CACHE_EXPIRED]: 'Cache entry expired.',
};

/**
 * HTTP status codes for error codes
 */
export const ErrorStatusCodes: Record<ErrorCode, number> = {
  // Authentication - 401
  [ErrorCodes.AUTH_TOKEN_EXPIRED]: 401,
  [ErrorCodes.AUTH_TOKEN_INVALID]: 401,
  [ErrorCodes.AUTH_TOKEN_MISSING]: 401,
  [ErrorCodes.AUTH_REQUIRED]: 401,
  [ErrorCodes.AUTH_REFRESH_FAILED]: 401,
  [ErrorCodes.AUTH_INVALID_CREDENTIALS]: 401,
  [ErrorCodes.AUTH_PERMISSION_DENIED]: 403,

  // Validation - 400
  [ErrorCodes.VALIDATION_FAILED]: 400,
  [ErrorCodes.VALIDATION_MISSING_FIELD]: 400,
  [ErrorCodes.VALIDATION_INVALID_FORMAT]: 400,
  [ErrorCodes.VALIDATION_OUT_OF_RANGE]: 400,
  [ErrorCodes.VALIDATION_INVALID_TYPE]: 400,

  // Resource - 404, 409, 410
  [ErrorCodes.RESOURCE_NOT_FOUND]: 404,
  [ErrorCodes.RESOURCE_ALREADY_EXISTS]: 409,
  [ErrorCodes.RESOURCE_CONFLICT]: 409,
  [ErrorCodes.RESOURCE_GONE]: 410,

  // Network - 502, 504
  [ErrorCodes.NETWORK_ERROR]: 502,
  [ErrorCodes.NETWORK_TIMEOUT]: 504,
  [ErrorCodes.NETWORK_CONNECTION_FAILED]: 502,
  [ErrorCodes.NETWORK_DNS_FAILED]: 502,

  // Rate Limiting - 429
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCodes.QUOTA_EXCEEDED]: 429,
  [ErrorCodes.THROTTLED]: 429,

  // Server - 500, 503
  [ErrorCodes.INTERNAL_ERROR]: 500,
  [ErrorCodes.SERVICE_UNAVAILABLE]: 503,
  [ErrorCodes.DATABASE_ERROR]: 500,
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]: 502,

  // Tool Execution - 500
  [ErrorCodes.TOOL_EXECUTION_FAILED]: 500,
  [ErrorCodes.TOOL_NOT_FOUND]: 404,
  [ErrorCodes.TOOL_INVALID_ARGS]: 400,
  [ErrorCodes.TOOL_TIMEOUT]: 504,

  // Client - 400
  [ErrorCodes.CLIENT_ERROR]: 400,
  [ErrorCodes.BAD_REQUEST]: 400,
  [ErrorCodes.UNSUPPORTED_OPERATION]: 501,

  // Cache - 500
  [ErrorCodes.CACHE_ERROR]: 500,
  [ErrorCodes.CACHE_MISS]: 404,
  [ErrorCodes.CACHE_EXPIRED]: 410,
};

/**
 * Check if an error is retryable
 */
export function isRetryableError(code: ErrorCode): boolean {
  const retryableErrors: ErrorCode[] = [
    ErrorCodes.NETWORK_ERROR,
    ErrorCodes.NETWORK_TIMEOUT,
    ErrorCodes.NETWORK_CONNECTION_FAILED,
    ErrorCodes.SERVICE_UNAVAILABLE,
    ErrorCodes.RATE_LIMIT_EXCEEDED,
    ErrorCodes.THROTTLED,
    ErrorCodes.TOOL_TIMEOUT,
  ];

  return retryableErrors.includes(code);
}

/**
 * Get retry delay in milliseconds based on attempt number
 */
export function getRetryDelay(attempt: number, baseDelay: number = 1000): number {
  // Exponential backoff: baseDelay * 2^attempt with jitter
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 1000; // Add random jitter up to 1 second
  return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
}
