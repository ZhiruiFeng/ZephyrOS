import type {
  ServiceContext,
  ServiceDependencies,
  ServiceResult,
  ServiceListResult,
  BaseService
} from './types';
import {
  ServiceError,
  BusinessRuleError,
  ValidationError,
  NotFoundError
} from './types';

export abstract class BaseServiceImpl implements BaseService {
  protected constructor(
    public readonly context: ServiceContext,
    public readonly dependencies: ServiceDependencies
  ) {}

  /**
   * Create a successful service result
   */
  protected success<T>(data: T, warnings?: string[]): ServiceResult<T> {
    return { data, error: null, warnings };
  }

  /**
   * Create a successful list result
   */
  protected successList<T>(data: T[], total?: number, warnings?: string[]): ServiceListResult<T> {
    return { data, error: null, total, warnings };
  }

  /**
   * Create an error result
   */
  protected error<T>(error: Error): ServiceResult<T> {
    return { data: null, error };
  }

  /**
   * Create an error list result
   */
  protected errorList<T>(error: Error): ServiceListResult<T> {
    return { data: null, error };
  }

  /**
   * Validate user has access to the service operation
   */
  protected validateUserAccess(): void {
    if (!this.context.userId) {
      throw new ServiceError('User context required', 'UNAUTHORIZED', 401);
    }
  }

  /**
   * Validate required parameters
   */
  protected validateRequired(value: any, name: string): void {
    if (value === null || value === undefined || value === '') {
      throw new ValidationError(`${name} is required`);
    }
  }

  /**
   * Validate business rules
   */
  protected validateBusinessRule(condition: boolean, message: string, details?: any): void {
    if (!condition) {
      throw new BusinessRuleError(message, details);
    }
  }

  /**
   * Safe async operation wrapper with error handling
   */
  protected async safeOperation<T>(
    operation: () => Promise<T>,
    errorMessage: string = 'Operation failed'
  ): Promise<ServiceResult<T>> {
    try {
      const result = await operation();
      return this.success(result);
    } catch (error) {
      if (error instanceof ServiceError) {
        return this.error(error);
      }

      console.error(`Service operation failed:`, error);
      return this.error(new ServiceError(errorMessage, 'INTERNAL_ERROR', 500));
    }
  }

  /**
   * Safe list operation wrapper with error handling
   */
  protected async safeListOperation<T>(
    operation: () => Promise<{ items: T[], total?: number }>,
    errorMessage: string = 'List operation failed'
  ): Promise<ServiceListResult<T>> {
    try {
      const { items, total } = await operation();
      return this.successList(items, total);
    } catch (error) {
      if (error instanceof ServiceError) {
        return this.errorList(error);
      }

      console.error(`Service list operation failed:`, error);
      return this.errorList(new ServiceError(errorMessage, 'INTERNAL_ERROR', 500));
    }
  }

  /**
   * Batch operation processor with error collection
   */
  protected async processBatch<TInput, TOutput>(
    items: TInput[],
    processor: (item: TInput, index: number) => Promise<TOutput>,
    batchSize: number = 10
  ): Promise<{
    results: Array<TOutput | null>;
    errors: Array<{ index: number; item: TInput; error: Error }>;
    successCount: number;
  }> {
    const results: Array<TOutput | null> = [];
    const errors: Array<{ index: number; item: TInput; error: Error }> = [];
    let successCount = 0;

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      const batchPromises = batch.map(async (item, batchIndex) => {
        const globalIndex = i + batchIndex;
        try {
          const result = await processor(item, globalIndex);
          results[globalIndex] = result;
          successCount++;
          return result;
        } catch (error) {
          results[globalIndex] = null;
          errors.push({
            index: globalIndex,
            item,
            error: error instanceof Error ? error : new Error(String(error))
          });
          return null;
        }
      });

      await Promise.all(batchPromises);
    }

    return { results, errors, successCount };
  }

  /**
   * Validate entity ownership by user
   */
  protected async validateEntityOwnership(
    repositoryCheck: () => Promise<boolean>,
    entityType: string,
    entityId: string
  ): Promise<void> {
    const hasAccess = await repositoryCheck();
    if (!hasAccess) {
      throw new NotFoundError(entityType, entityId);
    }
  }

  /**
   * Calculate confidence score based on multiple factors
   */
  protected calculateConfidence(factors: Array<{ weight: number; score: number }>): number {
    if (factors.length === 0) return 0;

    const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
    if (totalWeight === 0) return 0;

    const weightedSum = factors.reduce((sum, f) => sum + (f.weight * f.score), 0);
    return Math.max(0, Math.min(1, weightedSum / totalWeight));
  }

  /**
   * Normalize score to 0-1 range
   */
  protected normalizeScore(value: number, min: number, max: number): number {
    if (max <= min) return 0;
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }

  /**
   * Calculate time-based decay factor
   */
  protected calculateTimeDecay(
    timestamp: string,
    halfLifeDays: number = 30
  ): number {
    const now = new Date();
    const eventTime = new Date(timestamp);
    const daysDiff = (now.getTime() - eventTime.getTime()) / (1000 * 60 * 60 * 24);

    // Exponential decay: score = e^(-daysDiff * ln(2) / halfLifeDays)
    return Math.exp(-daysDiff * Math.LN2 / halfLifeDays);
  }

  /**
   * Validate date range
   */
  protected validateDateRange(startDate?: string, endDate?: string): void {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start >= end) {
        throw new ValidationError('Start date must be before end date');
      }

      // Prevent excessively large date ranges (e.g., more than 2 years)
      const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 730) {
        throw new ValidationError('Date range cannot exceed 2 years');
      }
    }
  }

  /**
   * Paginate results in memory (for post-processing scenarios)
   */
  protected paginateResults<T>(
    items: T[],
    offset: number = 0,
    limit: number = 50
  ): { items: T[]; total: number } {
    const total = items.length;
    const paginatedItems = items.slice(offset, offset + limit);

    return { items: paginatedItems, total };
  }

  /**
   * Generate operation metadata for logging and debugging
   */
  protected generateOperationMetadata(operation: string, details?: Record<string, any>) {
    return {
      operation,
      userId: this.context.userId,
      requestId: this.context.requestId,
      timestamp: new Date().toISOString(),
      ...details
    };
  }

  /**
   * Log service operation for debugging and monitoring
   */
  protected logOperation(
    level: 'info' | 'warn' | 'error',
    operation: string,
    details?: Record<string, any>
  ): void {
    const metadata = this.generateOperationMetadata(operation, details);

    switch (level) {
      case 'info':
        console.log(`[Service][${operation}]`, metadata);
        break;
      case 'warn':
        console.warn(`[Service][${operation}]`, metadata);
        break;
      case 'error':
        console.error(`[Service][${operation}]`, metadata);
        break;
    }
  }

  /**
   * Create warning message with context
   */
  protected createWarning(message: string, context?: Record<string, any>): string {
    const contextStr = context ? ` (${JSON.stringify(context)})` : '';
    return `${message}${contextStr}`;
  }

  /**
   * Validate array length constraints
   */
  protected validateArrayLength(
    array: any[],
    fieldName: string,
    min?: number,
    max?: number
  ): void {
    if (min !== undefined && array.length < min) {
      throw new ValidationError(`${fieldName} must have at least ${min} items`);
    }

    if (max !== undefined && array.length > max) {
      throw new ValidationError(`${fieldName} cannot have more than ${max} items`);
    }
  }

  /**
   * Validate numeric range
   */
  protected validateNumericRange(
    value: number,
    fieldName: string,
    min?: number,
    max?: number
  ): void {
    if (min !== undefined && value < min) {
      throw new ValidationError(`${fieldName} must be at least ${min}`);
    }

    if (max !== undefined && value > max) {
      throw new ValidationError(`${fieldName} cannot exceed ${max}`);
    }
  }
}