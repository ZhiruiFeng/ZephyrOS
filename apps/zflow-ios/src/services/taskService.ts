// Legacy compatibility file - delegates to the new modular API structure
// This maintains backward compatibility while using the new organized structure

import { tasksApi, categoriesApi } from '../lib/api';
import {
  Task,
  TaskMemory,
  CreateTaskRequest,
  TaskQueryParams,
  Category,
  TaskStats,
} from '../types/task';

export class TaskService {
  // Delegate all methods to the new tasksApi
  static async getTasks(params: TaskQueryParams = {}): Promise<TaskMemory[]> {
    console.log('📋 Fetching tasks with params:', params);
    return tasksApi.list(params);
  }

  static async getTask(id: string): Promise<TaskMemory> {
    console.log(`📋 Fetching task: ${id}`);
    return tasksApi.get(id);
  }

  static async createTask(taskData: CreateTaskRequest): Promise<TaskMemory> {
    console.log('📋 Creating task:', taskData.content.title);
    return tasksApi.create(taskData);
  }

  static async updateTask(id: string, taskData: Partial<CreateTaskRequest>): Promise<TaskMemory> {
    console.log(`📋 Updating task: ${id}`);
    return tasksApi.update(id, taskData);
  }

  static async deleteTask(id: string): Promise<void> {
    console.log(`📋 Deleting task: ${id}`);
    return tasksApi.delete(id);
  }

  static async updateTaskStatus(id: string, status: Task['status']): Promise<TaskMemory> {
    console.log(`📋 Updating task status: ${id} -> ${status}`);
    return tasksApi.updateStatus(id, status);
  }

  static async getTasksUpdatedToday(): Promise<TaskMemory[]> {
    console.log('📋 Fetching tasks updated today');
    return tasksApi.getUpdatedToday();
  }

  static async getTaskTree(id: string): Promise<TaskMemory[]> {
    console.log(`📋 Fetching task tree: ${id}`);
    return tasksApi.getTree(id);
  }

  // Timer operations - delegate to time tracking API
  static async startTimer(taskId: string): Promise<any> {
    console.log(`⏱️ Starting timer for task: ${taskId}`);
    const { timeTrackingApi } = await import('../lib/api');
    return timeTrackingApi.start(taskId);
  }

  static async stopTimer(taskId: string): Promise<any> {
    console.log(`⏱️ Stopping timer for task: ${taskId}`);
    const { timeTrackingApi } = await import('../lib/api');
    return timeTrackingApi.stop(taskId);
  }

  static async getTaskTimeEntries(taskId: string): Promise<any[]> {
    console.log(`⏱️ Fetching time entries for task: ${taskId}`);
    const { timeTrackingApi } = await import('../lib/api');
    return timeTrackingApi.getTaskTimeEntries(taskId);
  }

  // Convenience methods using new API
  static async getActiveTasks(): Promise<TaskMemory[]> {
    return tasksApi.getActive();
  }

  static async getPendingTasks(): Promise<TaskMemory[]> {
    return tasksApi.getPending();
  }

  static async getCompletedTasks(limit: number = 20): Promise<TaskMemory[]> {
    return tasksApi.getCompleted(limit);
  }

  static async getRootTasks(): Promise<TaskMemory[]> {
    return tasksApi.getRootTasks();
  }

  static async getOverdueTasks(): Promise<TaskMemory[]> {
    return tasksApi.getOverdue();
  }

  static async searchTasks(query: string): Promise<TaskMemory[]> {
    return tasksApi.search(query);
  }

  static async getTasksByCategory(categoryId: string): Promise<TaskMemory[]> {
    return tasksApi.getByCategory(categoryId);
  }

  static async getTasksByPriority(priority: Task['priority']): Promise<TaskMemory[]> {
    return tasksApi.getByPriority(priority);
  }
}

// Category service - delegate to new categoriesApi
export class CategoryService {
  static async getCategories(): Promise<Category[]> {
    console.log('🏷️ Fetching categories');
    return categoriesApi.list();
  }

  static async createCategory(categoryData: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<Category> {
    console.log('🏷️ Creating category:', categoryData.name);
    return categoriesApi.create(categoryData);
  }

  static async updateCategory(id: string, categoryData: Partial<Category>): Promise<Category> {
    console.log(`🏷️ Updating category: ${id}`);
    return categoriesApi.update(id, categoryData);
  }

  static async deleteCategory(id: string): Promise<void> {
    console.log(`🏷️ Deleting category: ${id}`);
    return categoriesApi.delete(id);
  }
}