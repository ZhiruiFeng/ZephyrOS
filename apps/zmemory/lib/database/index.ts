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
export { AITaskRepositoryImpl as AITaskRepository } from './repositories/ai-task-repository';
export { CategoryRepositoryImpl as CategoryRepository } from './repositories/category-repository';
export { ConversationRepositoryImpl as ConversationRepository } from './repositories/conversation-repository';
export { TaskRelationRepositoryImpl as TaskRelationRepository } from './repositories/task-relation-repository';
export { CorePrincipleRepository } from './repositories/core-principle-repository';
export { DailyStrategyRepository } from './repositories/daily-strategy-repository';
export { MindflowSTTInteractionRepositoryImpl as MindflowSTTInteractionRepository } from './repositories/mindflow-stt-repository';

// Type exports for repositories
export type { Memory, MemoryFilterParams } from './repositories/memory-repository';
export type { Task, TaskFilterParams, CreateSubtaskRequest, TaskTreeNode } from './repositories/task-repository';
export type { Activity, ActivityFilterParams } from './repositories/activity-repository';
export type { AITaskRepository as AITaskRepositoryInterface } from './repositories/ai-task-repository';
export type { CategoryRepository as CategoryRepositoryInterface } from './repositories/category-repository';
export type { ConversationRepository as ConversationRepositoryInterface } from './repositories/conversation-repository';
export type { TaskRelationRepository as TaskRelationRepositoryInterface } from './repositories/task-relation-repository';
export type { CorePrinciple, CorePrincipleFilterParams } from './repositories/core-principle-repository';
export type { DailyStrategyItem, DailyStrategyFilterParams } from './repositories/daily-strategy-repository';
export type { MindflowSTTInteractionRepository as MindflowSTTInteractionRepositoryInterface } from './repositories/mindflow-stt-repository';

// Factory function to create repository instances
import { getDatabaseClient } from './client';
import { MemoryRepository } from './repositories/memory-repository';
import { TaskRepository } from './repositories/task-repository';
import { ActivityRepository } from './repositories/activity-repository';
import { AITaskRepositoryImpl } from './repositories/ai-task-repository';
import { CategoryRepositoryImpl } from './repositories/category-repository';
import { ConversationRepositoryImpl } from './repositories/conversation-repository';
import { TaskRelationRepositoryImpl } from './repositories/task-relation-repository';
import { CorePrincipleRepository } from './repositories/core-principle-repository';
import { DailyStrategyRepository } from './repositories/daily-strategy-repository';
import { MindflowSTTInteractionRepositoryImpl } from './repositories/mindflow-stt-repository';

export function createMemoryRepository() {
  return new MemoryRepository(getDatabaseClient());
}

export function createTaskRepository() {
  return new TaskRepository(getDatabaseClient());
}

export function createActivityRepository() {
  return new ActivityRepository(getDatabaseClient());
}

export function createAITaskRepository() {
  return new AITaskRepositoryImpl(getDatabaseClient());
}

export function createCategoryRepository() {
  return new CategoryRepositoryImpl(getDatabaseClient());
}

export function createConversationRepository() {
  return new ConversationRepositoryImpl(getDatabaseClient());
}

export function createTaskRelationRepository() {
  return new TaskRelationRepositoryImpl(getDatabaseClient());
}

export function createCorePrincipleRepository() {
  return new CorePrincipleRepository(getDatabaseClient());
}

export function createDailyStrategyRepository() {
  return new DailyStrategyRepository(getDatabaseClient());
}

export function createMindflowSTTInteractionRepository() {
  return new MindflowSTTInteractionRepositoryImpl(getDatabaseClient());
}

// Repository container for dependency injection
export class RepositoryContainer {
  private memoryRepo?: MemoryRepository;
  private taskRepo?: TaskRepository;
  private activityRepo?: ActivityRepository;
  private aiTaskRepo?: AITaskRepositoryImpl;
  private categoryRepo?: CategoryRepositoryImpl;
  private conversationRepo?: ConversationRepositoryImpl;
  private taskRelationRepo?: TaskRelationRepositoryImpl;
  private corePrincipleRepo?: CorePrincipleRepository;
  private dailyStrategyRepo?: DailyStrategyRepository;
  private mindflowSTTInteractionRepo?: MindflowSTTInteractionRepositoryImpl;

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

  getAITaskRepository(): AITaskRepositoryImpl {
    if (!this.aiTaskRepo) {
      this.aiTaskRepo = createAITaskRepository();
    }
    return this.aiTaskRepo;
  }

  getCategoryRepository(): CategoryRepositoryImpl {
    if (!this.categoryRepo) {
      this.categoryRepo = createCategoryRepository();
    }
    return this.categoryRepo;
  }

  getConversationRepository(): ConversationRepositoryImpl {
    if (!this.conversationRepo) {
      this.conversationRepo = createConversationRepository();
    }
    return this.conversationRepo;
  }

  getTaskRelationRepository(): TaskRelationRepositoryImpl {
    if (!this.taskRelationRepo) {
      this.taskRelationRepo = createTaskRelationRepository();
    }
    return this.taskRelationRepo;
  }

  getCorePrincipleRepository(): CorePrincipleRepository {
    if (!this.corePrincipleRepo) {
      this.corePrincipleRepo = createCorePrincipleRepository();
    }
    return this.corePrincipleRepo;
  }

  getDailyStrategyRepository(): DailyStrategyRepository {
    if (!this.dailyStrategyRepo) {
      this.dailyStrategyRepo = createDailyStrategyRepository();
    }
    return this.dailyStrategyRepo;
  }

  getMindflowSTTInteractionRepository(): MindflowSTTInteractionRepositoryImpl {
    if (!this.mindflowSTTInteractionRepo) {
      this.mindflowSTTInteractionRepo = createMindflowSTTInteractionRepository();
    }
    return this.mindflowSTTInteractionRepo;
  }
}

// Default repository container instance
export const repositories = new RepositoryContainer();