/**
 * Unit tests for Error Handling System
 */

import {
  ZMemoryMCPError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  NetworkError,
  ToolExecutionError,
  normalizeError,
  isZMemoryError,
  ErrorCodes,
} from '../../../errors/index.js';
import { withRetry, CircuitBreaker } from '../../../errors/retry.js';
import { ErrorHandler, createErrorResponse } from '../../../middleware/error-handler.js';

describe('Error Handling System', () => {
  describe('ZMemoryMCPError', () => {
    it('should create error with all properties', () => {
      const error = new ZMemoryMCPError(
        ErrorCodes.INTERNAL_ERROR,
        'Test error',
        500,
        { user_id: 'user-001' }
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ZMemoryMCPError);
      expect(error.code).toBe(ErrorCodes.INTERNAL_ERROR);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.context?.user_id).toBe('user-001');
      expect(error.isOperational).toBe(true);
      expect(error.timestamp).toBeDefined();
    });

    it('should use default message from error code', () => {
      const error = new ZMemoryMCPError(ErrorCodes.AUTH_REQUIRED);

      expect(error.message).toContain('Authentication is required');
    });

    it('should convert to JSON', () => {
      const error = new ZMemoryMCPError(
        ErrorCodes.VALIDATION_FAILED,
        'Invalid input',
        400,
        { field: 'email' }
      );

      const json = error.toJSON();

      expect(json).toHaveProperty('error', 'ZMemoryMCPError');
      expect(json).toHaveProperty('code', ErrorCodes.VALIDATION_FAILED);
      expect(json).toHaveProperty('message', 'Invalid input');
      expect(json).toHaveProperty('statusCode', 400);
      expect(json).toHaveProperty('timestamp');
      expect(json.context).toEqual({ field: 'email' });
    });
  });

  describe('Specific Error Classes', () => {
    it('should create AuthenticationError', () => {
      const error = new AuthenticationError(
        ErrorCodes.AUTH_TOKEN_EXPIRED,
        'Token expired'
      );

      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error).toBeInstanceOf(ZMemoryMCPError);
      expect(error.code).toBe(ErrorCodes.AUTH_TOKEN_EXPIRED);
      expect(error.statusCode).toBe(401);
    });

    it('should create ValidationError with field info', () => {
      const error = new ValidationError(
        'Email is required',
        'email',
        undefined
      );

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.field).toBe('email');
      expect(error.context?.field).toBe('email');
    });

    it('should create NotFoundError with resource info', () => {
      const error = new NotFoundError('Task', 'task-123');

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toContain('Task');
      expect(error.message).toContain('task-123');
      expect(error.context?.resource_type).toBe('Task');
      expect(error.context?.resource_id).toBe('task-123');
      expect(error.statusCode).toBe(404);
    });

    it('should create RateLimitError with retry info', () => {
      const error = new RateLimitError('Rate limit exceeded', 60);

      expect(error).toBeInstanceOf(RateLimitError);
      expect(error.retryAfter).toBe(60);
      expect(error.context?.retry_after).toBe(60);
      expect(error.statusCode).toBe(429);
    });

    it('should create NetworkError', () => {
      const error = new NetworkError(
        ErrorCodes.NETWORK_TIMEOUT,
        'Request timed out'
      );

      expect(error).toBeInstanceOf(NetworkError);
      expect(error.code).toBe(ErrorCodes.NETWORK_TIMEOUT);
      expect(error.statusCode).toBe(504);
    });

    it('should create ToolExecutionError with tool name', () => {
      const error = new ToolExecutionError(
        'Tool failed',
        'create_task'
      );

      expect(error).toBeInstanceOf(ToolExecutionError);
      expect(error.toolName).toBe('create_task');
      expect(error.context?.tool_name).toBe('create_task');
    });
  });

  describe('normalizeError', () => {
    it('should return ZMemoryError as-is', () => {
      const original = new ValidationError('Test');
      const normalized = normalizeError(original);

      expect(normalized).toBe(original);
    });

    it('should convert Axios 401 error to AuthenticationError', () => {
      const axiosError = {
        isAxiosError: true,
        response: { status: 401 },
        message: 'Unauthorized',
      };

      const normalized = normalizeError(axiosError);

      expect(normalized).toBeInstanceOf(AuthenticationError);
      expect(normalized.statusCode).toBe(401);
    });

    it('should convert Axios 404 error to NotFoundError', () => {
      const axiosError = {
        isAxiosError: true,
        response: { status: 404 },
        message: 'Not found',
      };

      const normalized = normalizeError(axiosError);

      expect(normalized).toBeInstanceOf(NotFoundError);
      expect(normalized.statusCode).toBe(404);
    });

    it('should convert Axios 429 error to RateLimitError', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 429,
          headers: { 'retry-after': '60' },
        },
        message: 'Too many requests',
      };

      const normalized = normalizeError(axiosError);

      expect(normalized).toBeInstanceOf(RateLimitError);
      expect((normalized as RateLimitError).retryAfter).toBe(60);
    });

    it('should convert Axios timeout to NetworkError', () => {
      const axiosError = {
        isAxiosError: true,
        code: 'ETIMEDOUT',
        message: 'Timeout',
      };

      const normalized = normalizeError(axiosError);

      expect(normalized).toBeInstanceOf(NetworkError);
      expect(normalized.code).toBe(ErrorCodes.NETWORK_TIMEOUT);
    });

    it('should convert Zod error to ValidationError', () => {
      const zodError = {
        name: 'ZodError',
        issues: [
          {
            path: ['email'],
            message: 'Invalid email format',
          },
        ],
      };

      const normalized = normalizeError(zodError);

      expect(normalized).toBeInstanceOf(ValidationError);
      expect((normalized as ValidationError).field).toBe('email');
    });

    it('should convert generic error to InternalError', () => {
      const error = new Error('Something went wrong');
      const normalized = normalizeError(error);

      expect(isZMemoryError(normalized)).toBe(true);
      expect(normalized.code).toBe(ErrorCodes.INTERNAL_ERROR);
      expect(normalized.isOperational).toBe(false);
    });
  });

  describe('Retry Logic', () => {
    it('should retry on retryable errors', async () => {
      let attempts = 0;
      const fn = jest.fn(async () => {
        attempts++;
        if (attempts < 3) {
          throw new NetworkError(ErrorCodes.NETWORK_TIMEOUT);
        }
        return 'success';
      });

      const result = await withRetry(fn, { maxAttempts: 3, baseDelay: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const fn = jest.fn(async () => {
        throw new ValidationError('Invalid input');
      });

      await expect(
        withRetry(fn, { maxAttempts: 3, baseDelay: 10 })
      ).rejects.toThrow(ValidationError);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry callback', async () => {
      let attempts = 0;
      const fn = jest.fn(async () => {
        attempts++;
        if (attempts < 2) {
          throw new NetworkError(ErrorCodes.NETWORK_ERROR);
        }
        return 'success';
      });

      const onRetry = jest.fn();

      await withRetry(fn, {
        maxAttempts: 3,
        baseDelay: 10,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(
        expect.any(NetworkError),
        1,
        expect.any(Number)
      );
    });

    it('should call onFailure when exhausted', async () => {
      const fn = jest.fn(async () => {
        throw new NetworkError(ErrorCodes.NETWORK_ERROR);
      });

      const onFailure = jest.fn();

      await expect(
        withRetry(fn, {
          maxAttempts: 2,
          baseDelay: 10,
          onFailure,
        })
      ).rejects.toThrow();

      expect(onFailure).toHaveBeenCalledTimes(1);
      expect(onFailure).toHaveBeenCalledWith(
        expect.any(NetworkError),
        2
      );
    });

    it('should respect custom shouldRetry function', async () => {
      const fn = jest.fn(async () => {
        throw new ValidationError('Test');
      });

      const shouldRetry = jest.fn(() => true);

      await expect(
        withRetry(fn, {
          maxAttempts: 2,
          baseDelay: 10,
          shouldRetry,
        })
      ).rejects.toThrow();

      expect(fn).toHaveBeenCalledTimes(2);
      expect(shouldRetry).toHaveBeenCalled();
    });
  });

  describe('CircuitBreaker', () => {
    it('should open circuit after threshold failures', async () => {
      const breaker = new CircuitBreaker(3, 60000, 30000);
      const fn = jest.fn(async () => {
        throw new Error('Failure');
      });

      // Fail 3 times to open circuit
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(fn)).rejects.toThrow();
      }

      expect(breaker.getState()).toBe('open');
      expect(breaker.getFailureCount()).toBe(3);

      // Next call should fail immediately
      await expect(breaker.execute(fn)).rejects.toThrow('Circuit breaker is open');
      expect(fn).toHaveBeenCalledTimes(3); // Not 4, because circuit is open
    });

    it('should reset on success', async () => {
      const breaker = new CircuitBreaker(3, 60000, 30000);
      let shouldFail = true;

      const fn = jest.fn(async () => {
        if (shouldFail) {
          throw new Error('Failure');
        }
        return 'success';
      });

      // Fail twice
      await expect(breaker.execute(fn)).rejects.toThrow();
      await expect(breaker.execute(fn)).rejects.toThrow();

      expect(breaker.getFailureCount()).toBe(2);

      // Succeed once
      shouldFail = false;
      await breaker.execute(fn);

      expect(breaker.getState()).toBe('closed');
      expect(breaker.getFailureCount()).toBe(2); // Not reset in closed state
    });
  });

  describe('ErrorHandler', () => {
    it('should handle error and format response', () => {
      const handler = new ErrorHandler({ logErrors: false });
      const error = new ValidationError('Invalid input');

      const response = handler.handle(error);

      expect(response).toHaveProperty('content');
      expect(response.content[0].text).toContain('错误');
      expect(response.isError).toBe(true);
    });

    it('should include stack trace in development', () => {
      process.env.NODE_ENV = 'development';
      const handler = new ErrorHandler({
        logErrors: false,
        includeStackTrace: true,
      });
      const error = new ValidationError('Invalid input');

      const response = handler.handle(error);

      expect(response.content.length).toBeGreaterThan(1);
    });

    it('should use custom logger', () => {
      const logger = jest.fn();
      const handler = new ErrorHandler({ logger });
      const error = new ValidationError('Invalid input');

      handler.handle(error);

      expect(logger).toHaveBeenCalledWith(error);
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response from any error', () => {
      const error = new Error('Test error');
      const response = createErrorResponse(error);

      expect(response).toHaveProperty('isError', true);
      expect(response.content[0].text).toContain('错误');
    });

    it('should include context in error response', () => {
      const error = new NotFoundError('Task', 'task-123');
      const context = { user_id: 'user-001' };
      const response = createErrorResponse(error, context);

      expect(response).toHaveProperty('isError', true);
    });
  });
});
