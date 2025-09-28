// ===== Database Layer Exports =====
// This file provides a central export point for all database utilities

// Client and utilities
export * from './client';
export * from './types';

// Base repository
export { BaseRepository } from './repositories/base-repository';

// Specific repositories
export { MemoryRepository } from './repositories/memory-repository';
export { TaskRepository } from './repositories/task-repository';
export { ActivityRepository } from './repositories/activity-repository';

// Type exports for repositories
export type { Memory, MemoryFilterParams } from './repositories/memory-repository';
export type { Task, TaskFilterParams, CreateSubtaskRequest, TaskTreeNode } from './repositories/task-repository';
export type { Activity, ActivityFilterParams } from './repositories/activity-repository';

// Factory function to create repository instances
import { getDatabaseClient } from './client';
import { MemoryRepository } from './repositories/memory-repository';
import { TaskRepository } from './repositories/task-repository';
import { ActivityRepository } from './repositories/activity-repository';

export function createMemoryRepository() {
  return new MemoryRepository(getDatabaseClient());
}

export function createTaskRepository() {
  return new TaskRepository(getDatabaseClient());
}

export function createActivityRepository() {
  return new ActivityRepository(getDatabaseClient());
}

// Repository container for dependency injection
export class RepositoryContainer {
  private memoryRepo?: MemoryRepository;
  private taskRepo?: TaskRepository;
  private activityRepo?: ActivityRepository;

  getMemoryRepository(): MemoryRepository {
    if (!this.memoryRepo) {
      this.memoryRepo = createMemoryRepository();
    }
    return this.memoryRepo;
  }

  getTaskRepository(): TaskRepository {
    if (!this.taskRepo) {
      this.taskRepo = createTaskRepository();
    }
    return this.taskRepo;
  }

  getActivityRepository(): ActivityRepository {
    if (!this.activityRepo) {
      this.activityRepo = createActivityRepository();
    }
    return this.activityRepo;
  }
}

// Default repository container instance
export const repositories = new RepositoryContainer();