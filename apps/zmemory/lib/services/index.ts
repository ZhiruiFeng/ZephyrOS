// ===== Service Layer Exports =====
// This file provides a central export point for all business logic services

// Service types and interfaces
export * from './types';

// Base service class
export { BaseServiceImpl } from './base-service';

// Specific service implementations
export { MemoryAnalysisServiceImpl } from './memory-analysis-service';
export { TaskWorkflowServiceImpl, TaskHierarchyServiceImpl } from './task-workflow-service';
export { ActivityAnalyticsServiceImpl } from './activity-analytics-service';
export { HealthServiceImpl } from './health-service';
export { AgentFeaturesServiceImpl } from './agent-features-service';

// Service interfaces (for dependency injection and testing)
export type { MemoryAnalysisService } from './memory-analysis-service';
export type { TaskWorkflowService, TaskHierarchyService } from './task-workflow-service';
export type { ActivityAnalyticsService } from './activity-analytics-service';
export type { HealthService } from './health-service';
export type { AgentFeaturesService } from './agent-features-service';

// Service factory functions and dependency injection
import type { ServiceContext, ServiceDependencies } from './types';
import { MemoryAnalysisServiceImpl } from './memory-analysis-service';
import { TaskWorkflowServiceImpl, TaskHierarchyServiceImpl } from './task-workflow-service';
import { ActivityAnalyticsServiceImpl } from './activity-analytics-service';
import { HealthServiceImpl } from './health-service';
import { AgentFeaturesServiceImpl } from './agent-features-service';
import { repositories } from '@/database';

/**
 * Service factory functions
 */
export function createMemoryAnalysisService(
  context: ServiceContext,
  dependencies?: ServiceDependencies
): MemoryAnalysisServiceImpl {
  const deps = dependencies || {
    memoryRepository: repositories.getMemoryRepository(),
    taskRepository: repositories.getTaskRepository(),
    activityRepository: repositories.getActivityRepository()
  };
  return new MemoryAnalysisServiceImpl(context, deps);
}

export function createTaskWorkflowService(
  context: ServiceContext,
  dependencies?: ServiceDependencies
): TaskWorkflowServiceImpl {
  const deps = dependencies || {
    memoryRepository: repositories.getMemoryRepository(),
    taskRepository: repositories.getTaskRepository(),
    activityRepository: repositories.getActivityRepository()
  };
  return new TaskWorkflowServiceImpl(context, deps);
}

export function createTaskHierarchyService(
  context: ServiceContext,
  dependencies?: ServiceDependencies
): TaskHierarchyServiceImpl {
  const deps = dependencies || {
    memoryRepository: repositories.getMemoryRepository(),
    taskRepository: repositories.getTaskRepository(),
    activityRepository: repositories.getActivityRepository()
  };
  return new TaskHierarchyServiceImpl(context, deps);
}

export function createActivityAnalyticsService(
  context: ServiceContext,
  dependencies?: ServiceDependencies
): ActivityAnalyticsServiceImpl {
  const deps = dependencies || {
    memoryRepository: repositories.getMemoryRepository(),
    taskRepository: repositories.getTaskRepository(),
    activityRepository: repositories.getActivityRepository()
  };
  return new ActivityAnalyticsServiceImpl(context, deps);
}

export function createHealthService(
  context: ServiceContext,
  dependencies?: ServiceDependencies
): HealthServiceImpl {
  const deps = dependencies || {
    memoryRepository: repositories.getMemoryRepository(),
    taskRepository: repositories.getTaskRepository(),
    activityRepository: repositories.getActivityRepository()
  };
  return new HealthServiceImpl(context, deps);
}

export function createAgentFeaturesService(
  context: ServiceContext,
  dependencies?: ServiceDependencies
): AgentFeaturesServiceImpl {
  const deps = dependencies || {
    memoryRepository: repositories.getMemoryRepository(),
    taskRepository: repositories.getTaskRepository(),
    activityRepository: repositories.getActivityRepository()
  };
  return new AgentFeaturesServiceImpl(context, deps);
}

/**
 * Service container for managing service instances
 */
export class ServiceContainer {
  private services: Map<string, any> = new Map();

  constructor(
    private context: ServiceContext,
    private dependencies?: ServiceDependencies
  ) {}

  getMemoryAnalysisService(): MemoryAnalysisServiceImpl {
    const key = 'memoryAnalysis';
    if (!this.services.has(key)) {
      this.services.set(key, createMemoryAnalysisService(this.context, this.dependencies));
    }
    return this.services.get(key);
  }

  getTaskWorkflowService(): TaskWorkflowServiceImpl {
    const key = 'taskWorkflow';
    if (!this.services.has(key)) {
      this.services.set(key, createTaskWorkflowService(this.context, this.dependencies));
    }
    return this.services.get(key);
  }

  getTaskHierarchyService(): TaskHierarchyServiceImpl {
    const key = 'taskHierarchy';
    if (!this.services.has(key)) {
      this.services.set(key, createTaskHierarchyService(this.context, this.dependencies));
    }
    return this.services.get(key);
  }

  getActivityAnalyticsService(): ActivityAnalyticsServiceImpl {
    const key = 'activityAnalytics';
    if (!this.services.has(key)) {
      this.services.set(key, createActivityAnalyticsService(this.context, this.dependencies));
    }
    return this.services.get(key);
  }

  /**
   * Clear all cached service instances (useful for testing)
   */
  clearCache(): void {
    this.services.clear();
  }

  /**
   * Update context for all services (useful for request-scoped services)
   */
  updateContext(newContext: ServiceContext): ServiceContainer {
    return new ServiceContainer(newContext, this.dependencies);
  }
}

/**
 * Convenience function to create a service container with default dependencies
 */
export function createServiceContainer(context: ServiceContext, dependencies?: ServiceDependencies): ServiceContainer {
  return new ServiceContainer(context, dependencies);
}

/**
 * Service registry for managing service types and factories
 */
export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private factories: Map<string, Function> = new Map();

  private constructor() {
    // Register default service factories
    this.registerFactory('memoryAnalysis', createMemoryAnalysisService);
    this.registerFactory('taskWorkflow', createTaskWorkflowService);
    this.registerFactory('taskHierarchy', createTaskHierarchyService);
    this.registerFactory('activityAnalytics', createActivityAnalyticsService);
  }

  static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  registerFactory(name: string, factory: Function): void {
    this.factories.set(name, factory);
  }

  getFactory(name: string): Function | undefined {
    return this.factories.get(name);
  }

  createService<T>(name: string, context: ServiceContext, dependencies?: ServiceDependencies): T | null {
    const factory = this.factories.get(name);
    if (!factory) {
      return null;
    }
    return factory(context, dependencies) as T;
  }

  listServices(): string[] {
    return Array.from(this.factories.keys());
  }
}

/**
 * Default service registry instance
 */
export const serviceRegistry = ServiceRegistry.getInstance();

/**
 * Utility functions for common service operations
 */
export const ServiceUtils = {
  /**
   * Create a service context from basic parameters
   */
  createContext(userId: string, requestId?: string, metadata?: Record<string, any>): ServiceContext {
    return {
      userId,
      requestId: requestId || `req_${Date.now()}`,
      metadata
    };
  },

  /**
   * Create service dependencies from repository container
   */
  createDependencies(): ServiceDependencies {
    return {
      memoryRepository: repositories.getMemoryRepository(),
      taskRepository: repositories.getTaskRepository(),
      activityRepository: repositories.getActivityRepository()
    };
  },

  /**
   * Create a fully configured service container for a user
   */
  createUserServiceContainer(userId: string, requestId?: string): ServiceContainer {
    const context = this.createContext(userId, requestId);
    const dependencies = this.createDependencies();
    return createServiceContainer(context, dependencies);
  }
};

/**
 * Higher-order function for service composition and middleware
 */
export function withServiceMiddleware<T extends Function>(
  serviceMethod: T,
  ...middlewares: Array<(context: ServiceContext, next: Function) => Promise<any>>
): T {
  return (async (...args: any[]) => {
    let index = 0;

    const dispatch = async (i: number): Promise<any> => {
      if (i >= middlewares.length) {
        return serviceMethod(...args);
      }

      const middleware = middlewares[i];
      return middleware(args[0] as ServiceContext, () => dispatch(i + 1));
    };

    return dispatch(0);
  }) as unknown as T;
}

/**
 * Service middleware examples
 */
export const ServiceMiddleware = {
  /**
   * Logging middleware for service operations
   */
  logging: (context: ServiceContext, next: Function) => {
    return async (...args: any[]) => {
      console.log(`[Service] Starting operation for user ${context.userId}`);
      const startTime = Date.now();

      try {
        const result = await next(...args);
        const duration = Date.now() - startTime;
        console.log(`[Service] Operation completed in ${duration}ms`);
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[Service] Operation failed after ${duration}ms:`, error);
        throw error;
      }
    };
  },

  /**
   * Rate limiting middleware
   */
  rateLimit: (maxRequests: number, windowMs: number) => {
    const requests = new Map<string, number[]>();

    return (context: ServiceContext, next: Function) => {
      return async (...args: any[]) => {
        const userId = context.userId;
        const now = Date.now();
        const userRequests = requests.get(userId) || [];

        // Remove old requests outside the window
        const validRequests = userRequests.filter(time => now - time < windowMs);

        if (validRequests.length >= maxRequests) {
          throw new Error('Rate limit exceeded');
        }

        validRequests.push(now);
        requests.set(userId, validRequests);

        return next(...args);
      };
    };
  },

  /**
   * Validation middleware
   */
  validate: (validator: (args: any[]) => boolean | string) => {
    return (context: ServiceContext, next: Function) => {
      return async (...args: any[]) => {
        const validationResult = validator(args);

        if (validationResult === false) {
          throw new Error('Validation failed');
        }

        if (typeof validationResult === 'string') {
          throw new Error(validationResult);
        }

        return next(...args);
      };
    };
  }
};