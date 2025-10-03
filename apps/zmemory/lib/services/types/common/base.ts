import type { MemoryRepository, TaskRepository, ActivityRepository, AITaskRepositoryInterface, CategoryRepository } from '@/database';

// Service result types
export interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
  warnings?: string[];
}

export interface ServiceListResult<T> {
  data: T[] | null;
  error: Error | null;
  total?: number;
  warnings?: string[];
}

// Base service context
export interface ServiceContext {
  userId: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

// Service dependency injection
export interface ServiceDependencies {
  memoryRepository: MemoryRepository;
  taskRepository: TaskRepository;
  activityRepository: ActivityRepository;
  aiTaskRepository: AITaskRepositoryInterface;
  categoryRepository?: CategoryRepository;
  // Add other repositories as needed
}

// Common service interfaces
export interface BaseService {
  readonly context: ServiceContext;
  readonly dependencies: ServiceDependencies;
}

// Service factory types
export type ServiceFactory<T extends BaseService> = (
  context: ServiceContext,
  dependencies: ServiceDependencies
) => T;