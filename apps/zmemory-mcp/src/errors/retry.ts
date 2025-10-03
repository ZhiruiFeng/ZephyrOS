/**
 * Retry Logic for Transient Failures
 *
 * Provides utilities for retrying failed operations with exponential backoff
 */

import { isRetryableError, getRetryDelay, ErrorCode } from './error-codes.js';
import { isZMemoryError, ZMemoryMCPError, normalizeError } from './index.js';

/**
 * Retry options
 */
export interface RetryOptions {
  /**
   * Maximum number of retry attempts
   * @default 3
   */
  maxAttempts?: number;

  /**
   * Base delay in milliseconds for exponential backoff
   * @default 1000
   */
  baseDelay?: number;

  /**
   * Maximum delay in milliseconds
   * @default 30000
   */
  maxDelay?: number;

  /**
   * Custom function to determine if error should be retried
   */
  shouldRetry?: (error: ZMemoryMCPError, attempt: number) => boolean;

  /**
   * Callback called before each retry
   */
  onRetry?: (error: ZMemoryMCPError, attempt: number, delay: number) => void;

  /**
   * Callback called when all retries are exhausted
   */
  onFailure?: (error: ZMemoryMCPError, attempts: number) => void;
}

/**
 * Default retry options
 */
const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'shouldRetry' | 'onRetry' | 'onFailure'>> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
};

/**
 * Execute a function with retry logic
 *
 * @param fn - The function to execute
 * @param options - Retry options
 * @returns Promise that resolves with the function result
 * @throws ZMemoryMCPError when all retry attempts are exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = DEFAULT_RETRY_OPTIONS.maxAttempts,
    baseDelay = DEFAULT_RETRY_OPTIONS.baseDelay,
    maxDelay = DEFAULT_RETRY_OPTIONS.maxDelay,
    shouldRetry: customShouldRetry,
    onRetry,
    onFailure,
  } = options;

  let lastError: ZMemoryMCPError | undefined;
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      lastError = normalizeError(error);

      // Check if we should retry
      const shouldRetry = customShouldRetry
        ? customShouldRetry(lastError, attempt)
        : isRetryableError(lastError.code);

      // If this was the last attempt or error is not retryable, throw
      if (attempt >= maxAttempts || !shouldRetry) {
        if (onFailure) {
          onFailure(lastError, attempt);
        }
        throw lastError;
      }

      // Calculate delay and wait
      const delay = Math.min(getRetryDelay(attempt - 1, baseDelay), maxDelay);

      if (onRetry) {
        onRetry(lastError, attempt, delay);
      }

      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript requires it
  throw lastError || new Error('Unknown error occurred');
}

/**
 * Retry decorator for async methods
 *
 * @param options - Retry options
 */
export function Retry(options: RetryOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return withRetry(() => originalMethod.apply(this, args), options);
    };

    return descriptor;
  };
}

/**
 * Create a circuit breaker for preventing repeated failures
 */
export class CircuitBreaker {
  private failureCount: number = 0;
  private lastFailureTime?: number;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000, // 1 minute
    private readonly resetTimeout: number = 30000 // 30 seconds
  ) {}

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      // Check if we should try half-open
      if (Date.now() - (this.lastFailureTime || 0) > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();

      // Success - reset if half-open or increment success
      if (this.state === 'half-open') {
        this.reset();
      }

      return result;
    } catch (error) {
      this.recordFailure();

      // If we're half-open and still failing, go back to open
      if (this.state === 'half-open') {
        this.state = 'open';
        this.lastFailureTime = Date.now();
      }

      throw error;
    }
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = 'open';
    }
  }

  private reset(): void {
    this.failureCount = 0;
    this.state = 'closed';
    this.lastFailureTime = undefined;
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Batch retry - retry a batch of operations with individual retry logic
 */
export async function batchWithRetry<T>(
  operations: Array<() => Promise<T>>,
  options: RetryOptions = {}
): Promise<Array<{ success: boolean; result?: T; error?: ZMemoryMCPError }>> {
  return Promise.all(
    operations.map(async (op) => {
      try {
        const result = await withRetry(op, options);
        return { success: true, result };
      } catch (error) {
        return {
          success: false,
          error: normalizeError(error),
        };
      }
    })
  );
}

/**
 * Retry with timeout
 */
export async function withRetryAndTimeout<T>(
  fn: () => Promise<T>,
  timeout: number,
  retryOptions: RetryOptions = {}
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(
        normalizeError(new Error(`Operation timed out after ${timeout}ms`))
      );
    }, timeout);
  });

  return Promise.race([withRetry(fn, retryOptions), timeoutPromise]);
}
