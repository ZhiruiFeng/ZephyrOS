// Export all API modules and types
export * from './api-base';
export * from './tasks-api';
export * from './categories-api';
export * from './time-tracking-api';
export * from './subtasks-api';
export * from './narrative-api';
export * from './memories-api';
export * from './activities-api';

// Re-export individual APIs for convenience
export { tasksApi } from './tasks-api';
export { categoriesApi } from './categories-api';
export { timeTrackingApi } from './time-tracking-api';
export { subtasksApi } from './subtasks-api';
export { seasonApi, episodeApi, narrativeApi, narrativeApiClient } from './narrative-api';
export { memoriesApi, useMemoryOperations } from './memories-api';
export { activitiesApi } from './activities-api';

// Legacy compatibility - Combined API client similar to zmemoryApi
import { API_BASE, authManager, authenticatedFetch, ApiError } from './api-base';
import { tasksApi } from './tasks-api';
import { categoriesApi } from './categories-api';
import { timeTrackingApi } from './time-tracking-api';
import { subtasksApi } from './subtasks-api';
import { narrativeApiClient } from './narrative-api';
import { memoriesApi } from './memories-api';
import { activitiesApi } from './activities-api';

// Combined API client for backward compatibility
export const apiClient = {
  // Tasks
  tasks: tasksApi,

  // Categories
  categories: categoriesApi,

  // Time tracking
  timeTracking: timeTrackingApi,

  // Subtasks
  subtasks: subtasksApi,

  // Narrative (seasons & episodes)
  narrative: narrativeApiClient,

  // Memories
  memories: memoriesApi,

  // Activities
  activities: activitiesApi,

  // Auth utilities
  auth: {
    getAuthHeaders: () => authManager.getAuthHeaders(),
    clearCache: () => authManager.clearCache(),
  },

  // Base utilities
  request: authenticatedFetch,
  ApiError,
  API_BASE,
};

// Unified API client (similar to original zmemoryApi)
export const zmemoryApi = {
  // Task methods (backward compatibility)
  async getTasks(params?: any) {
    return tasksApi.list(params);
  },

  async getTask(id: string) {
    return tasksApi.get(id);
  },

  async createTask(task: any) {
    return tasksApi.create(task);
  },

  async updateTask(id: string, updates: any) {
    return tasksApi.update(id, updates);
  },

  async deleteTask(id: string) {
    return tasksApi.delete(id);
  },

  // Category methods (backward compatibility)
  async getCategories() {
    return categoriesApi.list();
  },

  async createCategory(category: any) {
    return categoriesApi.create(category);
  },

  async updateCategory(id: string, updates: any) {
    return categoriesApi.update(id, updates);
  },

  async deleteCategory(id: string) {
    return categoriesApi.delete(id);
  },

  // Timer methods (backward compatibility)
  async startTimer(taskId: string, options?: any) {
    return timeTrackingApi.start(taskId, options);
  },

  async stopTimer(taskId: string, options?: any) {
    return timeTrackingApi.stop(taskId, options);
  },

  async getTaskTimeEntries(taskId: string) {
    return timeTrackingApi.getTaskTimeEntries(taskId);
  },

  // Auth cache management
  clearAuthCache() {
    authManager.clearCache();
  },

  // Direct access to modular APIs
  tasks: tasksApi,
  categories: categoriesApi,
  timeTracking: timeTrackingApi,
  subtasks: subtasksApi,
  narrative: narrativeApiClient,
  memories: memoriesApi,
  activities: activitiesApi,
};

// Default export for convenience
export default apiClient;