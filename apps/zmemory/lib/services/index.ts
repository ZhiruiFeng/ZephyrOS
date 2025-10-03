// ===== Service Layer Exports =====
// This file provides a central export point for all business logic services

// Service types and interfaces
export * from './types';

// Base service class
export { BaseServiceImpl } from './base-service';

// Specific service implementations
export { MemoryAnalysisServiceImpl } from './memory-analysis-service';
export { MemoryServiceImpl } from './memory-service';
export { TaskWorkflowServiceImpl, TaskHierarchyServiceImpl } from './task-workflow-service';
export { TaskServiceImpl } from './task-service';
export { ActivityServiceImpl } from './activity-service';
export { ActivityAnalyticsServiceImpl } from './activity-analytics-service';
export { HealthServiceImpl } from './health-service';
export { AgentFeaturesServiceImpl } from './agent-features-service';
export { AITaskServiceImpl } from './ai-task-service';
export { CategoryServiceImpl } from './category-service';
export { ConversationServiceImpl } from './conversation-service';
export { TaskRelationServiceImpl } from './task-relation-service';
export { VendorServiceImpl } from './vendor-service';
export { InteractionTypeServiceImpl } from './interaction-type-service';
export { EnergyDayServiceImpl } from './energy-day-service';
export { ExecutorService, createExecutorService } from './executor-service';

// Service interfaces (for dependency injection and testing)
export type { MemoryAnalysisService } from './memory-analysis-service';
export type { MemoryService } from './memory-service';
export type { TaskWorkflowService, TaskHierarchyService } from './task-workflow-service';
export type { TaskService } from './task-service';
export type { ActivityService } from './activity-service';
export type { ActivityAnalyticsService } from './activity-analytics-service';
export type { HealthService } from './health-service';
export type { AgentFeaturesService } from './agent-features-service';
export type { AITaskService } from './ai-task-service';
export type { CategoryService } from './category-service';
export type { ConversationService } from './conversation-service';
export type { TaskRelationService } from './task-relation-service';
export type { VendorService } from './vendor-service';
export type { InteractionTypeService } from './interaction-type-service';
export type { EnergyDayService } from './energy-day-service';

// Service factory functions and dependency injection
import type { ServiceContext, ServiceDependencies } from './types';
import { MemoryAnalysisServiceImpl } from './memory-analysis-service';
import { MemoryServiceImpl } from './memory-service';
import { TaskWorkflowServiceImpl, TaskHierarchyServiceImpl } from './task-workflow-service';
import { TaskServiceImpl } from './task-service';
import { ActivityServiceImpl } from './activity-service';
import { ActivityAnalyticsServiceImpl } from './activity-analytics-service';
import { HealthServiceImpl } from './health-service';
import { AgentFeaturesServiceImpl } from './agent-features-service';
import { AITaskServiceImpl } from './ai-task-service';
import { CategoryServiceImpl } from './category-service';
import { ConversationServiceImpl } from './conversation-service';
import { TaskRelationServiceImpl } from './task-relation-service';
import { VendorServiceImpl } from './vendor-service';
import { InteractionTypeServiceImpl } from './interaction-type-service';
import { EnergyDayServiceImpl } from './energy-day-service';
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
    activityRepository: repositories.getActivityRepository(),
    aiTaskRepository: repositories.getAITaskRepository()
  };
  return new MemoryAnalysisServiceImpl(context, deps);
}

export function createMemoryService(
  context: ServiceContext,
  dependencies?: ServiceDependencies
): MemoryServiceImpl {
  const deps = dependencies || {
    memoryRepository: repositories.getMemoryRepository(),
    taskRepository: repositories.getTaskRepository(),
    activityRepository: repositories.getActivityRepository(),
    aiTaskRepository: repositories.getAITaskRepository()
  };
  return new MemoryServiceImpl(context, deps);
}

export function createTaskWorkflowService(
  context: ServiceContext,
  dependencies?: ServiceDependencies
): TaskWorkflowServiceImpl {
  const deps = dependencies || {
    memoryRepository: repositories.getMemoryRepository(),
    taskRepository: repositories.getTaskRepository(),
    activityRepository: repositories.getActivityRepository(),
    aiTaskRepository: repositories.getAITaskRepository()
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
    activityRepository: repositories.getActivityRepository(),
    aiTaskRepository: repositories.getAITaskRepository()
  };
  return new TaskHierarchyServiceImpl(context, deps);
}

export function createTaskService(
  context: ServiceContext,
  dependencies?: ServiceDependencies
): TaskServiceImpl {
  const deps = dependencies || {
    memoryRepository: repositories.getMemoryRepository(),
    taskRepository: repositories.getTaskRepository(),
    activityRepository: repositories.getActivityRepository(),
    aiTaskRepository: repositories.getAITaskRepository(),
    categoryRepository: repositories.getCategoryRepository()
  };
  return new TaskServiceImpl(context, deps);
}

export function createActivityService(
  context: ServiceContext,
  dependencies?: ServiceDependencies
): ActivityServiceImpl {
  const deps = dependencies || {
    memoryRepository: repositories.getMemoryRepository(),
    taskRepository: repositories.getTaskRepository(),
    activityRepository: repositories.getActivityRepository(),
    aiTaskRepository: repositories.getAITaskRepository()
  };
  return new ActivityServiceImpl(context, deps);
}

export function createActivityAnalyticsService(
  context: ServiceContext,
  dependencies?: ServiceDependencies
): ActivityAnalyticsServiceImpl {
  const deps = dependencies || {
    memoryRepository: repositories.getMemoryRepository(),
    taskRepository: repositories.getTaskRepository(),
    activityRepository: repositories.getActivityRepository(),
    aiTaskRepository: repositories.getAITaskRepository()
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
    activityRepository: repositories.getActivityRepository(),
    aiTaskRepository: repositories.getAITaskRepository()
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
    activityRepository: repositories.getActivityRepository(),
    aiTaskRepository: repositories.getAITaskRepository()
  };
  return new AgentFeaturesServiceImpl(context, deps);
}

export function createAITaskService(
  context: ServiceContext,
  dependencies?: ServiceDependencies
): AITaskServiceImpl {
  const deps = dependencies || {
    memoryRepository: repositories.getMemoryRepository(),
    taskRepository: repositories.getTaskRepository(),
    activityRepository: repositories.getActivityRepository(),
    aiTaskRepository: repositories.getAITaskRepository()
  };
  return new AITaskServiceImpl(context, deps);
}

export function createCategoryService(
  context: ServiceContext,
  dependencies?: ServiceDependencies
): CategoryServiceImpl {
  const deps = dependencies || {
    memoryRepository: repositories.getMemoryRepository(),
    taskRepository: repositories.getTaskRepository(),
    activityRepository: repositories.getActivityRepository(),
    aiTaskRepository: repositories.getAITaskRepository()
  };
  return new CategoryServiceImpl(context, deps);
}

export function createTaskRelationService(
  context: ServiceContext,
  dependencies?: ServiceDependencies
): TaskRelationServiceImpl {
  const deps = dependencies || {
    memoryRepository: repositories.getMemoryRepository(),
    taskRepository: repositories.getTaskRepository(),
    activityRepository: repositories.getActivityRepository(),
    aiTaskRepository: repositories.getAITaskRepository()
  };
  return new TaskRelationServiceImpl(context, deps);
}

export function createVendorService(
  context: ServiceContext,
  dependencies?: ServiceDependencies
): VendorServiceImpl {
  const deps = dependencies || {
    memoryRepository: repositories.getMemoryRepository(),
    taskRepository: repositories.getTaskRepository(),
    activityRepository: repositories.getActivityRepository(),
    aiTaskRepository: repositories.getAITaskRepository()
  };
  return new VendorServiceImpl(context, deps);
}

export function createInteractionTypeService(
  context: ServiceContext,
  dependencies?: ServiceDependencies
): InteractionTypeServiceImpl {
  const deps = dependencies || {
    memoryRepository: repositories.getMemoryRepository(),
    taskRepository: repositories.getTaskRepository(),
    activityRepository: repositories.getActivityRepository(),
    aiTaskRepository: repositories.getAITaskRepository()
  };
  return new InteractionTypeServiceImpl(context, deps);
}

export function createConversationService(
  context: ServiceContext,
  dependencies?: ServiceDependencies
): ConversationServiceImpl {
  const deps = dependencies || {
    memoryRepository: repositories.getMemoryRepository(),
    taskRepository: repositories.getTaskRepository(),
    activityRepository: repositories.getActivityRepository(),
    aiTaskRepository: repositories.getAITaskRepository()
  };
  return new ConversationServiceImpl(context, deps);
}

export function createEnergyDayService(
  context: ServiceContext,
  dependencies?: ServiceDependencies
): EnergyDayServiceImpl {
  const deps = dependencies || {
    memoryRepository: repositories.getMemoryRepository(),
    taskRepository: repositories.getTaskRepository(),
    activityRepository: repositories.getActivityRepository(),
    aiTaskRepository: repositories.getAITaskRepository()
  };
  return new EnergyDayServiceImpl(context, deps);
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
      activityRepository: repositories.getActivityRepository(),
      aiTaskRepository: repositories.getAITaskRepository()
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